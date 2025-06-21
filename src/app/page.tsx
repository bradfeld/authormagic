export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <main className="text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Author<span className="text-indigo-600">Magic</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              Unleash the power of intelligent writing tools for authors, creators, and storytellers.
            </p>
            <div className="flex gap-4 justify-center">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors">
                Get Started
              </button>
              <button className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-indigo-900 font-semibold py-3 px-6 rounded-lg transition-colors">
                Learn More
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-indigo-600 text-4xl mb-4">✍️</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Smart Writing Assistant
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI-powered writing suggestions and improvements for better storytelling.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-indigo-600 text-4xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Story Organization
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Keep your characters, plots, and timelines organized in one place.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="text-indigo-600 text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Goal Tracking
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Set and track your writing goals with detailed progress analytics.
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🚀 Currently in Development
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              AuthorMagic is being built with modern technologies to provide the best writing experience for authors.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
