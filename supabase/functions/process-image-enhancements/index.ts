// Supabase Edge Function for processing image enhancement queue
// Runs periodically to enhance secondary book images in the background

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface EnhancementJob {
  job_id: string;
  isbn: string;
  title: string;
  author: string;
  source: string;
  priority: number;
  attempts: number;
}

interface ISBNDBResponse {
  book?: {
    image?: string;
    title?: string;
    authors?: string[];
    publisher?: string;
    date_published?: string;
  };
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting image enhancement job processing...');

    // Get pending enhancement jobs (limit to 10 to avoid timeouts)
    const { data: jobs, error: jobsError } = await supabase.rpc(
      'get_next_enhancement_jobs',
      { p_limit: 10 },
    );

    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch enhancement jobs',
          details: jobsError,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log('ℹ️ No pending enhancement jobs found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No jobs to process',
          jobsProcessed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`📚 Processing ${jobs.length} enhancement jobs...`);

    const results = {
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    };

    // Process each job
    for (const job of jobs as EnhancementJob[]) {
      results.processed++;

      try {
        console.log(
          `🔍 Processing job ${job.job_id} for ISBN ${job.isbn} (attempt ${job.attempts})`,
        );

        // Call ISBNDB API to get enhanced book data
        const isbndbApiKey = Deno.env.get('ISBNDB_API_KEY');
        if (!isbndbApiKey) {
          throw new Error('ISBNDB API key not configured');
        }

        const response = await fetch(
          `https://api2.isbndb.com/book/${job.isbn}`,
          {
            headers: {
              Authorization: isbndbApiKey,
            },
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            // Book not found - mark as skipped
            console.log(
              `📭 ISBN ${job.isbn} not found in ISBNDB, marking as skipped`,
            );

            await supabase.rpc('complete_enhancement_job', {
              p_job_id: job.job_id,
              p_enhanced_image_url: null,
              p_enhancement_metadata: {
                skipped: true,
                reason: 'ISBN not found in ISBNDB',
                http_status: response.status,
              },
            });

            // Update job status to skipped
            await supabase
              .from('image_enhancement_queue')
              .update({ status: 'skipped' })
              .eq('id', job.job_id);

            results.skipped++;
            continue;
          }

          throw new Error(
            `ISBNDB API error: ${response.status} ${response.statusText}`,
          );
        }

        const bookData: ISBNDBResponse = await response.json();

        if (!bookData.book?.image) {
          // No image available - mark as completed but with null image
          console.log(`🖼️ No image available for ISBN ${job.isbn}`);

          await supabase.rpc('complete_enhancement_job', {
            p_job_id: job.job_id,
            p_enhanced_image_url: null,
            p_enhancement_metadata: {
              no_image_available: true,
              book_data: bookData.book,
            },
          });

          results.completed++;
          continue;
        }

        // Successfully found enhanced image
        console.log(
          `✅ Enhanced image found for ISBN ${job.isbn}: ${bookData.book.image}`,
        );

        await supabase.rpc('complete_enhancement_job', {
          p_job_id: job.job_id,
          p_enhanced_image_url: bookData.book.image,
          p_enhancement_metadata: {
            enhanced: true,
            book_data: bookData.book,
            enhancement_timestamp: new Date().toISOString(),
          },
        });

        results.completed++;
      } catch (error) {
        console.error(`❌ Error processing job ${job.job_id}:`, error);

        // Mark job as failed with error details
        await supabase.rpc('fail_enhancement_job', {
          p_job_id: job.job_id,
          p_error_message: error.message || 'Unknown error',
          p_reschedule_after_minutes: 60, // Retry after 1 hour
        });

        results.failed++;
      }

      // Small delay between jobs to be nice to ISBNDB API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Log processing summary
    console.log(
      `🎯 Processing complete: ${results.completed} completed, ${results.failed} failed, ${results.skipped} skipped`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image enhancement processing complete',
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('💥 Fatal error in image enhancement processing:', error);

    return new Response(
      JSON.stringify({
        error: 'Image enhancement processing failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

/* Example usage:
 *
 * Manual trigger:
 * curl -X POST https://your-project.supabase.co/functions/v1/process-image-enhancements
 *
 * The function will:
 * 1. Fetch up to 10 pending enhancement jobs
 * 2. Call ISBNDB API for each ISBN
 * 3. Update jobs with enhanced image URLs
 * 4. Handle errors and retries automatically
 * 5. Return processing summary
 */
