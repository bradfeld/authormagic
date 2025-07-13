'use client'

// EXAMPLE: Generated from v0.dev and adapted for AuthorMagic
// Prompt used: "Create a modern author statistics card showing book sales, reviews, and ratings using shadcn/ui Card component"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Star, TrendingUp, Users } from 'lucide-react'

interface AuthorStatsCardProps {
  authorName: string
  totalBooks: number
  totalSales: number
  averageRating: number
  reviewCount: number
  trend: 'up' | 'down' | 'stable'
}

export function AuthorStatsCard({ 
  authorName, 
  totalBooks, 
  totalSales, 
  averageRating, 
  reviewCount, 
  trend 
}: AuthorStatsCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold">{authorName}</span>
          <Badge variant="secondary">Author</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Books Published */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Books</p>
                <p className="text-lg font-semibold">{totalBooks}</p>
              </div>
            </div>

            {/* Total Sales */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                <TrendingUp className={`h-4 w-4 ${getTrendColor()}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sales</p>
                <p className="text-lg font-semibold">{formatNumber(totalSales)}</p>
              </div>
            </div>

            {/* Average Rating */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-md">
                <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="text-lg font-semibold">{averageRating.toFixed(1)}</p>
              </div>
            </div>

            {/* Review Count */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Reviews</p>
                <p className="text-lg font-semibold">{formatNumber(reviewCount)}</p>
              </div>
            </div>
          </div>

          {/* Performance Indicator */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Performance</span>
              <div className="flex items-center gap-1">
                <TrendingUp className={`h-3 w-3 ${getTrendColor()}`} />
                <span className={getTrendColor()}>
                  {trend === 'up' ? 'Trending Up' : trend === 'down' ? 'Declining' : 'Stable'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 