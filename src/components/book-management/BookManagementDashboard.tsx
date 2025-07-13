'use client'

import { useState } from 'react'
import { UIBook, sampleUIBooks } from '@/lib/types/ui-book'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, TrendingUp, Users, Zap, Plus, Library } from 'lucide-react'
import { EditionSelectionDialog } from './EditionSelectionDialog'
import { BookLibrary } from './BookLibrary'
import { BookDetailModal } from './BookDetailModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Author } from '@/lib/services/author-profile.service'

interface BookManagementDashboardProps {
  authorProfile: Author | null
}

export function BookManagementDashboard({ authorProfile }: BookManagementDashboardProps) {
  const [books, setBooks] = useState<UIBook[]>(sampleUIBooks)
  const [selectedBook, setSelectedBook] = useState<UIBook | null>(null)
  const [showBookDetail, setShowBookDetail] = useState(false)
  const [showAddBookDialog, setShowAddBookDialog] = useState(false)

  const handleAddBook = (book: UIBook) => {
    // Add book to the collection
    setBooks(prev => [...prev, book])
    console.log('Book added to library:', book)
    
    // TODO: Here we'll integrate with Supabase to persist the book
    // For now, we're just managing local state
  }

  const handleViewBook = (book: UIBook) => {
    setSelectedBook(book)
    setShowBookDetail(true)
  }

  const handleEditBook = (book: UIBook) => {
    setSelectedBook(book)
    setShowBookDetail(true)
  }

  const handleDeleteBook = (bookToDelete: UIBook) => {
    // Remove book from the collection
    setBooks(prev => prev.filter(book => 
      book.id !== bookToDelete.id
    ))
    console.log('Book removed from library:', bookToDelete)
    
    // TODO: Here we'll integrate with Supabase to delete the book
  }

  const handleSaveBook = (updatedBook: UIBook) => {
    // Update the book in the collection
    setBooks(prev => prev.map(book => 
      book.id === updatedBook.id ? updatedBook : book
    ))
    console.log('Book updated:', updatedBook)
    
    // TODO: Here we'll integrate with Supabase to update the book
  }

  const handleCloseBookDetail = () => {
    setShowBookDetail(false)
    setSelectedBook(null)
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{books.length}</div>
            <p className="text-xs text-muted-foreground">
              {books.length === 0 ? 'No books added yet' : 'Books in your library'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">No sales data yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No contacts added</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Content</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No content generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="library" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <EditionSelectionDialog 
              isOpen={showAddBookDialog}
              onOpenChange={setShowAddBookDialog}
              onBookAdded={() => {
                // Refresh the book list - we'll implement this properly later
                console.log('Book added - refreshing list');
                setShowAddBookDialog(false);
              }}
            >
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Book
              </Button>
            </EditionSelectionDialog>
          </div>
        </div>

        <TabsContent value="library" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Library className="h-5 w-5" />
                Your Book Library
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage your books, view details, and track your collection
              </p>
            </div>
          </div>

          <BookLibrary
            books={books}
            onViewBook={handleViewBook}
            onEditBook={handleEditBook}
            onDeleteBook={handleDeleteBook}
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="text-center py-16">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Tracking</h3>
            <p className="text-gray-600 mb-4">
              Connect your sales platforms to track performance and revenue
            </p>
            <Button variant="outline">Connect Sales Platforms</Button>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="text-center py-16">
            <Zap className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Content Generation</h3>
            <p className="text-gray-600 mb-4">
              Create compelling marketing content with our Claude AI-powered generator
            </p>
            <Button variant="outline">Generate Content</Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBook}
        open={showBookDetail}
        onClose={handleCloseBookDetail}
        onSave={handleSaveBook}
      />
    </div>
  )
} 