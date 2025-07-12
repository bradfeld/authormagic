import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AuthorMagic</h1>
          <p className="text-gray-600 mt-2">Create your account and start marketing your book</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-lg',
            },
          }}
        />
      </div>
    </div>
  )
} 