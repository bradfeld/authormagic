'use client'

import { useState, useEffect } from 'react'
import { UIBook } from '@/lib/types/ui-book'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Edit, Save, X, Calendar, Users, Building, FileText, Tag } from 'lucide-react'

interface BookDetailModalProps {
  book: UIBook | null
  open: boolean
  onClose: () => void
  onSave?: (book: UIBook) => void
}

export function BookDetailModal({ book, open, onClose, onSave }: BookDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedBook, setEditedBook] = useState<UIBook | null>(null)

  // Reset state when book changes
  useEffect(() => {
    if (book) {
      setEditedBook({ ...book })
      setIsEditing(false)
    }
  }, [book])

  const handleSave = () => {
    if (editedBook && onSave) {
      onSave(editedBook)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    if (book) {
      setEditedBook({ ...book })
      setIsEditing(false)
    }
  }

  const handleFieldChange = (field: keyof UIBook, value: string | string[] | number | undefined) => {
    if (editedBook) {
      setEditedBook({
        ...editedBook,
        [field]: value
      })
    }
  }

  const handleCategoryChange = (categories: string) => {
    const categoryArray = categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0)
    handleFieldChange('categories', categoryArray)
  }

  if (!book || !editedBook) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {isEditing ? 'Edit Book' : 'Book Details'}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && onSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  {isEditing ? (
                    <Input
                      value={editedBook.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-lg font-semibold">{book.title}</p>
                  )}
                </div>

                {/* Authors */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    <Users className="inline h-4 w-4 mr-2" />
                    Authors
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedBook.authors?.join(', ') || ''}
                      onChange={(e) => handleFieldChange('authors', e.target.value.split(',').map(a => a.trim()))}
                      placeholder="Separate multiple authors with commas"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-600">{book.authors?.join(', ') || 'Unknown'}</p>
                  )}
                </div>

                {/* Publisher */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    <Building className="inline h-4 w-4 mr-2" />
                    Publisher
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedBook.publisher || ''}
                      onChange={(e) => handleFieldChange('publisher', e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-600">{book.publisher || 'Unknown'}</p>
                  )}
                </div>

                {/* Published Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    <Calendar className="inline h-4 w-4 mr-2" />
                    Published Date
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedBook.published_date || ''}
                      onChange={(e) => handleFieldChange('published_date', e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-600">{book.published_date || 'Unknown'}</p>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* ISBN */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    <BookOpen className="inline h-4 w-4 mr-2" />
                    ISBN
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedBook.isbn || ''}
                      onChange={(e) => handleFieldChange('isbn', e.target.value)}
                      className="w-full font-mono"
                    />
                  ) : (
                    <p className="text-gray-600 font-mono">{book.isbn || 'Unknown'}</p>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    <Tag className="inline h-4 w-4 mr-2" />
                    Categories
                  </label>
                  {isEditing ? (
                    <Input
                      value={editedBook.categories?.join(', ') || ''}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      placeholder="Separate categories with commas"
                      className="w-full"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {book.categories?.map((category, index) => (
                        <Badge key={index} variant="secondary">
                          {category}
                        </Badge>
                      )) || <span className="text-gray-500">No categories</span>}
                    </div>
                  )}
                </div>

                {/* Page Count */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Pages</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedBook.page_count || ''}
                      onChange={(e) => handleFieldChange('page_count', parseInt(e.target.value) || undefined)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-600">{book.page_count || 'Unknown'}</p>
                  )}
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Language</label>
                  {isEditing ? (
                    <Input
                      value={editedBook.language || ''}
                      onChange={(e) => handleFieldChange('language', e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-600">{book.language || 'Unknown'}</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="description" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                <FileText className="inline h-4 w-4 mr-2" />
                Description
              </label>
              {isEditing ? (
                <Textarea
                  value={editedBook.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full min-h-[200px]"
                  placeholder="Enter book description..."
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {book.description || 'No description available.'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data Source</label>
                    <p className="text-sm text-gray-600">{book.data_source || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">External ID</label>
                    <p className="text-sm text-gray-600 font-mono">{book.external_id || 'None'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="text-sm text-gray-600">
                      {book.updated_at ? new Date(book.updated_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Maturity Rating</label>
                    <p className="text-sm text-gray-600">{book.maturity_rating || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Print Type</label>
                    <p className="text-sm text-gray-600">{book.print_type || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Content Version</label>
                    <p className="text-sm text-gray-600">{book.content_version || 'Unknown'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 