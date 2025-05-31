import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { KanoFeature, KanoTableData } from "@shared/schema";

interface FeatureModalProps {
  feature: KanoFeature | null;
  tableData?: KanoTableData;
  isOpen: boolean;
  onClose: () => void;
}

const categoryLabels = {
  "must-have": "Must-Have Feature",
  "performance": "Performance Benefit",
  "delighter": "Delighter Feature",
};

const categoryColors = {
  "must-have": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
  "performance": "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
  "delighter": "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
};

export default function FeatureModal({ feature, tableData, isOpen, onClose }: FeatureModalProps) {
  if (!feature || !tableData) return null;

  const featureRatings = tableData.ratings[feature.id] || {};
  const featureSources = tableData.sources[feature.id] || [];

  // Count positive vs negative ratings
  const positiveCount = Object.values(featureRatings).filter(
    rating => rating === "Yes" || rating === "High"
  ).length;
  const negativeCount = Object.values(featureRatings).filter(
    rating => rating === "No" || rating === "Low"
  ).length;
  const totalProducts = tableData.products.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {feature.name}
            </DialogTitle>
            <Badge className={categoryColors[feature.category]}>
              {categoryLabels[feature.category]}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customer Benefit Analysis
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feature Description */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Feature Description</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {feature.description}
            </p>
          </div>

          {/* Customer Benefit */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Customer Benefit</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {feature.customerBenefit}
            </p>
          </div>

          {/* Competitive Position */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Competitive Position</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tableData.products.map((product) => {
                const rating = featureRatings[product] || "N/A";
                const isPositive = rating === "Yes" || rating === "High";
                const isNegative = rating === "No" || rating === "Low";
                
                return (
                  <Card
                    key={product}
                    className={`p-3 ${
                      isPositive
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : isNegative
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className={`font-medium ${
                      isPositive 
                        ? "text-green-900 dark:text-green-100"
                        : isNegative
                        ? "text-red-900 dark:text-red-100"
                        : "text-gray-900 dark:text-gray-100"
                    }`}>
                      {product}
                    </div>
                    <div className={`text-sm mt-1 ${
                      isPositive
                        ? "text-green-700 dark:text-green-300"
                        : isNegative
                        ? "text-red-700 dark:text-red-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {rating === "Yes" && "✓ Available"}
                      {rating === "No" && "✗ Not available"}
                      {rating === "High" && "⬆ High performance"}
                      {rating === "Medium" && "➡ Medium performance"}
                      {rating === "Low" && "⬇ Low performance"}
                      {!["Yes", "No", "High", "Medium", "Low"].includes(rating) && rating}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Market Analysis */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Market Analysis</h4>
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {positiveCount}/{totalProducts}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Have Feature</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {negativeCount}/{totalProducts}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Don't Have</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {Math.round((positiveCount / totalProducts) * 100)}%
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">Market Adoption</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Source Documentation */}
          {featureSources.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Source Documentation</h4>
              <div className="space-y-2">
                {featureSources.map((source, index) => {
                  // Extract domain from URL for display
                  const getDisplayDomain = (url: string) => {
                    try {
                      const domain = new URL(url).hostname;
                      return domain.replace('www.', '');
                    } catch {
                      return 'Research Source';
                    }
                  };

                  const isValidUrl = source.startsWith('http://') || source.startsWith('https://');

                  return (
                    <Card key={index} className="p-3 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      {isValidUrl ? (
                        <a 
                          href={source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Source {index + 1}: {getDisplayDomain(source)}
                            </div>
                            <ExternalLink className="h-4 w-4 text-blue-500 hover:text-blue-600" />
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate hover:text-blue-700">
                            {source}
                          </div>
                        </a>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Source {index + 1}: Research Documentation
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {source}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strategic Recommendation */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Strategic Recommendation</h4>
            <Card className="p-4 kano-gradient-light border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-900 dark:text-white">
                {positiveCount === 0 && (
                  <><strong>Unique Opportunity:</strong> No competitors have this feature. Consider featuring it prominently in marketing materials.</>
                )}
                {positiveCount === totalProducts && (
                  <><strong>Market Standard:</strong> All competitors have this feature. Ensure parity to remain competitive.</>
                )}
                {positiveCount > 0 && positiveCount < totalProducts && (
                  <><strong>Competitive Gap:</strong> {positiveCount} of {totalProducts} competitors have this feature. {
                    positiveCount > totalProducts / 2 
                      ? "Consider developing to maintain competitive parity."
                      : "Opportunity to differentiate if this aligns with customer needs."
                  }</>
                )}
              </p>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
