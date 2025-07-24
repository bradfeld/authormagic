import { auth } from '@clerk/nextjs/server';
import { Book, Plus, Search } from 'lucide-react';
import { redirect } from 'next/navigation';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function BooksPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Books</h1>
            <p className="text-gray-600">
              Manage your book library and track your reading progress.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </div>

        {/* Coming Soon Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Book Management
            </CardTitle>
            <CardDescription>
              Advanced book management features are coming soon!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Book className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Book Library Coming Soon
              </h3>
              <p className="text-gray-600 mb-4">
                We&apos;re building powerful tools to help you manage your book
                collection, track reading progress, and discover new titles.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Search Books
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Book
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
