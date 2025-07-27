// Image Enhancement Queue Service
// Manages background image enhancement queue integration

import { createServiceClient } from '@/lib/supabase/server';
import { UIBook } from '@/lib/types/ui-book';

// Development logging helper
const devLog = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message);
  }
};

export interface EnhancementQueueJob {
  id: string;
  isbn: string;
  title: string;
  author?: string;
  source: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  priority: number;
  attempts: number;
  created_at: string;
  enhanced_image_url?: string;
}

export interface EnhancementStats {
  total_jobs: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  skipped_jobs: number;
  retryable_jobs: number;
  avg_processing_time_seconds: number;
  jobs_last_24h: number;
  completed_last_24h: number;
}

export class ImageEnhancementQueueService {
  /**
   * Add books to the enhancement queue for background processing
   */
  static async enqueueBooks(
    books: UIBook[],
    searchContext: { title: string; author?: string },
    parentSearchId?: string,
  ): Promise<{ queued: number; skipped: number; errors: string[] }> {
    const results = { queued: 0, skipped: 0, errors: [] as string[] };

    try {
      const supabase = createServiceClient();

      for (const book of books) {
        // Only queue books that need image enhancement
        if (!book.isbn || book.image) {
          results.skipped++;
          continue;
        }

        try {
          const { error } = await supabase.rpc('enqueue_image_enhancement', {
            p_isbn: book.isbn,
            p_title: book.title || 'Unknown Title',
            p_author:
              book.authors?.[0] || searchContext.author || 'Unknown Author',
            p_source: book.source || 'isbn-db',
            p_search_context: {
              original_search: searchContext,
              book_binding: book.binding,
              book_language: book.language,
              queued_at: new Date().toISOString(),
            },
            p_priority: this.calculatePriority(book),
            p_parent_search_id: parentSearchId,
          });

          if (error) {
            results.errors.push(
              `Failed to queue ${book.isbn}: ${error.message}`,
            );
            continue;
          }

          results.queued++;
          devLog(
            `📤 QUEUE: Added ${book.isbn} (${book.title}) to enhancement queue`,
          );
        } catch (jobError) {
          results.errors.push(
            `Error queuing ${book.isbn}: ${jobError instanceof Error ? jobError.message : 'Unknown error'}`,
          );
        }
      }

      if (results.queued > 0) {
        devLog(
          `📊 QUEUE SUMMARY: ${results.queued} books queued, ${results.skipped} skipped, ${results.errors.length} errors`,
        );
      }

      return results;
    } catch (error) {
      results.errors.push(
        `Global error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return results;
    }
  }

  /**
   * Calculate priority for enhancement queue (lower number = higher priority)
   */
  private static calculatePriority(book: UIBook): number {
    let priority = 5; // Default priority

    // Hardcover books get higher priority
    if (book.binding?.toLowerCase() === 'hardcover') {
      priority -= 1;
    }

    // Books with edition information get higher priority
    if (book.edition) {
      priority -= 1;
    }

    // Newer books get slightly higher priority
    if (book.year && book.year >= 2020) {
      priority -= 1;
    }

    // Ensure priority is within valid range (1-10)
    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Get enhancement queue statistics
   */
  static async getQueueStats(): Promise<EnhancementStats | null> {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('image_enhancement_stats')
        .select('*')
        .single();

      if (error) {
        // Skip error logging in production
        return null;
      }

      return data as EnhancementStats;
    } catch {
      // Skip error logging in production
      return null;
    }
  }

  /**
   * Get recent enhancement jobs for monitoring
   */
  static async getRecentJobs(
    limit: number = 50,
  ): Promise<EnhancementQueueJob[]> {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('image_enhancement_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Skip error logging in production
        return [];
      }

      return data as EnhancementQueueJob[];
    } catch {
      // Skip error logging in production
      return [];
    }
  }

  /**
   * Manually trigger the enhancement processing (for testing)
   */
  static async triggerProcessing(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // This would call the Supabase Edge Function
      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/process-image-enhancements`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Failed to trigger processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Apply enhanced images to books after background processing
   * This can be called during subsequent searches to use enhanced images
   */
  static async applyEnhancedImages(books: UIBook[]): Promise<UIBook[]> {
    try {
      const isbns = books
        .filter(book => book.isbn && !book.image)
        .map(book => book.isbn);

      if (isbns.length === 0) {
        return books;
      }

      // Fetch completed enhancement jobs for these ISBNs
      const supabase = createServiceClient();
      const { data: enhancements, error } = await supabase
        .from('image_enhancement_queue')
        .select('isbn, enhanced_image_url, enhancement_metadata')
        .in('isbn', isbns)
        .eq('status', 'completed')
        .not('enhanced_image_url', 'is', null);

      if (error || !enhancements?.length) {
        return books;
      }

      // Create lookup map for enhanced images
      const enhancedImageMap = new Map(
        enhancements.map(e => [e.isbn, e.enhanced_image_url]),
      );

      // Apply enhanced images to books
      const enhancedBooks = books.map(book => {
        if (book.isbn && enhancedImageMap.has(book.isbn)) {
          const enhancedImage = enhancedImageMap.get(book.isbn);
          devLog(
            `🎨 ENHANCED: Applied background-enhanced image for ${book.isbn}`,
          );
          return {
            ...book,
            image: enhancedImage,
          };
        }
        return book;
      });

      return enhancedBooks;
    } catch {
      // Skip error logging in production
      return books;
    }
  }
}
