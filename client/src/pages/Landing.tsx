import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Lens-shaped logo */}
            <div className="kano-lens-logo">
              <div className="inner"></div>
              <div className="core"></div>
            </div>
            <h1 className="text-xl font-mono-heading font-semibold text-gray-900 dark:text-white">kanolens</h1>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              BETA
            </Badge>
          </div>
          
          <Button onClick={handleSignIn} variant="outline" className="border-slate-300 dark:border-slate-600">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              <span className="kano-gradient bg-clip-text text-transparent">KanoLens:</span><br />
              Instantly See How You Stack Up
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Unlock rapid, clear product comparisons with interactive Kano Model tables, 
              AI-driven insights, and shareable reports—purpose-built for product managers and innovators.
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handleSignIn} 
              size="lg" 
              className="kano-gradient text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started Free
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 text-center space-y-4">
              <div className="kano-gradient-light rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <div className="text-2xl">⚡</div>
              </div>
              <h3 className="font-mono-heading font-semibold text-gray-900 dark:text-white">Under 10 Minutes</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Complete competitive analysis from start to finish in record time
              </p>
            </CardContent>
          </Card>

          <Card className="border-violet-200 dark:border-violet-800">
            <CardContent className="p-6 text-center space-y-4">
              <div className="kano-gradient-light rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <div className="text-2xl">🧠</div>
              </div>
              <h3 className="font-mono-heading font-semibold text-gray-900 dark:text-white">AI-Powered</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Smart feature categorization using advanced OpenAI technology
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center space-y-4">
              <div className="kano-gradient-light rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <div className="text-2xl">🔗</div>
              </div>
              <h3 className="font-mono-heading font-semibold text-gray-900 dark:text-white">Shareable</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Instant collaboration with exportable reports and live links
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="max-w-2xl mx-auto kano-gradient-light border-blue-200 dark:border-blue-800">
            <CardContent className="p-8 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ready to Transform Your Competitive Analysis?
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Join product managers who are already using KanoLens to make faster, 
                data-driven decisions about their competitive positioning.
              </p>
              <Button 
                onClick={handleSignIn} 
                size="lg" 
                className="kano-gradient text-white px-8 py-3 font-semibold"
              >
                Start Your Free Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
            <p>&copy; 2024 KanoLens. All rights reserved.</p>
            <p className="mt-2">Powered by OpenAI GPT-4 • Built for Product Managers</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
