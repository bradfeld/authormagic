'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, BookOpen, Plus, Loader2, Calendar, Users, Building, Hash, User, Book } from 'lucide-react'
import { UIBook } from '@/lib/types/ui-book'
import { Author } from '@/lib/services/author-profile.service'
import { ISBNDBBookResponse } from '@/lib/types/api'

// Convert ISBNDB response to UIBook for display
function convertISBNDBToUIBook(isbndbBook: ISBNDBBookResponse): UIBook {
  return {
    id: isbndbBook.isbn13 || isbndbBook.isbn || 'temp-id',
    title: isbndbBook.title || 'Unknown Title',
    subtitle: isbndbBook.title_long || isbndbBook.synopsis,
    authors: isbndbBook.authors || [],
    publisher: isbndbBook.publisher,
    published_date: isbndbBook.date_published,
    isbn: isbndbBook.isbn13 || isbndbBook.isbn,
    categories: isbndbBook.subjects || [],
    description: isbndbBook.synopsis || isbndbBook.overview
  }
}

interface AddBookDialogProps {
  children: React.ReactNode
  onBookAdded?: (book: UIBook) => void
  authorProfile: Author | null
}

export function AddBookDialog({ children, onBookAdded }: AddBookDialogProps) {
  const [open, setOpen] = useState(false)
  
  // Three separate search fields
  const [isbnQuery, setIsbnQuery] = useState('')
  const [authorQuery, setAuthorQuery] = useState('')
  const [titleQuery, setTitleQuery] = useState('')
  const [titleAuthorQuery, setTitleAuthorQuery] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<UIBook[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSearchType, setActiveSearchType] = useState<'isbn' | 'author' | 'title-author' | null>(null)

  // ISBN Search Function
  const handleISBNSearch = async () => {
    if (!isbnQuery.trim()) return
    
    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    setActiveSearchType('isbn')
    
    try {
      const cleanISBN = isbnQuery.replace(/[-\s]/g, '')
      const response = await fetch(`/api/books/isbn/${encodeURIComponent(cleanISBN)}`)
      const data = await response.json()
      
      if (response.ok && data.success && data.data) {
        const book = convertISBNDBToUIBook(data.data)
        setSearchResults([book])
      } else {
        setError(data.error || 'No book found with that ISBN')
        setSearchResults([])
      }
    } catch (err) {
      console.error('ISBN search error:', err)
      setError('Failed to search by ISBN')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Author Search Function  
  const handleAuthorSearch = async () => {
    if (!authorQuery.trim()) return
    
    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    setActiveSearchType('author')
    
    try {
      const response = await fetch(`/api/books/author/${encodeURIComponent(authorQuery)}?maxResults=10`)
      const data = await response.json()
      
      if (response.ok && data.success && data.data) {
        const books = data.data.map((book: ISBNDBBookResponse) => convertISBNDBToUIBook(book))
        setSearchResults(books)
        
        if (books.length === 0) {
          setError('No books found for this author')
        }
      } else {
        setError(data.error || 'No books found for this author')
        setSearchResults([])
      }
    } catch (err) {
      console.error('Author search error:', err)
      setError('Failed to search by author')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Title + Author Search Function
  const handleTitleAuthorSearch = async () => {
    if (!titleQuery.trim() && !titleAuthorQuery.trim()) return
    
    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    setActiveSearchType('title-author')
    
    try {
      const params = new URLSearchParams()
      if (titleQuery.trim()) params.append('title', titleQuery.trim())
      if (titleAuthorQuery.trim()) params.append('author', titleAuthorQuery.trim())
      params.append('maxResults', '10')
      
      const response = await fetch(`/api/books/title-author?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok && data.success && data.data) {
        const books = data.data.map((book: ISBNDBBookResponse) => convertISBNDBToUIBook(book))
        setSearchResults(books)
        
        if (books.length === 0) {
          setError('No books found matching title and author')
        }
      } else {
        setError(data.error || 'No books found matching your search')
        setSearchResults([])
      }
    } catch (err) {
      console.error('Title+Author search error:', err)
      setError('Failed to search by title and author')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Clear all search fields and results
  const clearAllSearches = () => {
    setIsbnQuery('')
    setAuthorQuery('')
    setTitleQuery('')
    setTitleAuthorQuery('')
    setSearchResults([])
    setHasSearched(false)
    setError(null)
    setActiveSearchType(null)
  }

  const handleAddBook = async (book: UIBook) => {
    try {
      // Here you would typically save to your database
      // For now, we'll just call the onBookAdded callback
      
      if (onBookAdded) {
        onBookAdded(book)
      }
      
      // Clear search results and close dialog
      clearAllSearches()
      setOpen(false)
    } catch (error) {
      console.error('Error adding book:', error)
      setError('Failed to add book to library')
    }
  }

  // Handle Enter key press for each search field
  const handleKeyPress = (e: React.KeyboardEvent, searchType: 'isbn' | 'author' | 'title-author') => {
    if (e.key === 'Enter') {
      switch (searchType) {
        case 'isbn':
          handleISBNSearch()
          break
        case 'author':
          handleAuthorSearch()
          break
        case 'title-author':
          handleTitleAuthorSearch()
          break
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="!max-w-[50vw] !w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Add Book to Library
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Three Search Sections */}
          <div className="space-y-6">
            
            {/* ISBN Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <h3 className="font-medium">Search by ISBN</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter ISBN (10 or 13 digits)"
                  value={isbnQuery}
                  onChange={(e) => setIsbnQuery(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'isbn')}
                  className="flex-1"
                />
                <Button 
                  onClick={handleISBNSearch}
                  disabled={isLoading || !isbnQuery.trim()}
                  size="sm"
                >
                  {isLoading && activeSearchType === 'isbn' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Author Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <h3 className="font-medium">Search by Author</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter author name"
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'author')}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAuthorSearch}
                  disabled={isLoading || !authorQuery.trim()}
                  size="sm"
                >
                  {isLoading && activeSearchType === 'author' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Title + Author Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4" />
                <h3 className="font-medium">Search by Title + Author</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Book title"
                  value={titleQuery}
                  onChange={(e) => setTitleQuery(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'title-author')}
                />
                <Input
                  placeholder="Author name"
                  value={titleAuthorQuery}
                  onChange={(e) => setTitleAuthorQuery(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'title-author')}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleTitleAuthorSearch}
                  disabled={isLoading || (!titleQuery.trim() && !titleAuthorQuery.trim())}
                  className="flex-1"
                  size="sm"
                >
                  {isLoading && activeSearchType === 'title-author' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Books
                    </>
                  )}
                </Button>
                <Button 
                  onClick={clearAllSearches}
                  variant="outline"
                  size="sm"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Search Results */}
          {hasSearched && searchResults.length === 0 && !error && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No books found. Try a different search.</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Search Results</h3>
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {searchResults.map((book, index) => (
                  <Card key={book.id || index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        {/* Book Info */}
                        <div className="col-span-2 space-y-2">
                          <div>
                            <h4 className="font-medium text-lg leading-tight">{book.title}</h4>
                            {book.subtitle && (
                              <p className="text-sm text-gray-600 mt-1">{book.subtitle}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {book.authors && book.authors.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{book.authors.join(', ')}</span>
                              </div>
                            )}
                            {book.published_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{book.published_date}</span>
                              </div>
                            )}
                            {book.publisher && (
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                <span>{book.publisher}</span>
                              </div>
                            )}
                          </div>

                          {book.isbn && (
                            <div className="text-sm text-gray-500">
                              ISBN: {book.isbn}
                            </div>
                          )}
                        </div>

                        {/* Categories and Action */}
                        <div className="space-y-3">
                          {book.categories && book.categories.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-gray-700">Categories</h5>
                              <div className="flex flex-wrap gap-1">
                                {book.categories.slice(0, 3).map((category, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {category}
                                  </Badge>
                                ))}
                                {book.categories.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{book.categories.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <Button 
                            onClick={() => handleAddBook(book)}
                            className="w-full"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Book
                          </Button>
                        </div>
                      </div>
                      
                      {book.description && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {book.description}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 