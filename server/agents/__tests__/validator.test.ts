import { describe, it, expect, beforeEach } from 'vitest';
import { ValidatorAgent } from '../validator';

describe('ValidatorAgent', () => {
  let validator: ValidatorAgent;

  beforeEach(() => {
    validator = new ValidatorAgent();
  });

  describe('categorizeFeatures', () => {
    it('should categorize features based on adoption rate', async () => {
      const request = {
        researchData: {
          products: [
            {
              name: 'Product A',
              features: [
                {
                  name: 'User Authentication',
                  description: 'Basic login and user management',
                  benefit: 'Secure access control',
                  implementationDetails: 'Standard OAuth implementation'
                },
                {
                  name: 'AI Assistant',
                  description: 'AI-powered help system',
                  benefit: 'Transforms user experience',
                  implementationDetails: 'Advanced ML models'
                }
              ]
            },
            {
              name: 'Product B',
              features: [
                {
                  name: 'User Authentication',
                  description: 'Login system with SSO',
                  benefit: 'Secure access',
                  implementationDetails: 'Enterprise SSO support'
                },
                {
                  name: 'Custom Workflows',
                  description: 'Build custom automation',
                  benefit: 'Unique process optimization',
                  implementationDetails: 'Visual workflow builder'
                }
              ]
            }
          ]
        },
        targetCustomer: 'Enterprise Teams'
      };

      const result = await validator.categorizeFeatures(request);

      // User Authentication should be must-have (100% adoption)
      const authFeature = result.categorizedFeatures.find(f => f.featureName === 'User Authentication');
      expect(authFeature).toBeDefined();
      expect(authFeature?.category).toBe('must-have');
      expect(authFeature?.categoryRationale).toContain('100%');

      // AI Assistant should be delighter (50% adoption, innovative)
      const aiFeature = result.categorizedFeatures.find(f => f.featureName === 'AI Assistant');
      expect(aiFeature).toBeDefined();
      expect(aiFeature?.category).toBe('delighter');

      // Summary should be accurate
      expect(result.summary.totalFeatures).toBe(3);
      expect(result.summary.mustHaves).toBe(1);
    });

    it('should identify performance features based on metrics', async () => {
      const request = {
        researchData: {
          products: [
            {
              name: 'Product A',
              features: [
                {
                  name: 'Processing Speed',
                  description: 'Fast data processing',
                  benefit: 'Improved efficiency',
                  implementationDetails: 'Optimized algorithms',
                  performanceMetrics: '100ms average'
                }
              ]
            },
            {
              name: 'Product B',
              features: [
                {
                  name: 'Processing Speed',
                  description: 'Quick processing',
                  benefit: 'Better performance',
                  implementationDetails: 'Standard processing',
                  performanceMetrics: '200ms average'
                }
              ]
            }
          ]
        },
        targetCustomer: 'Data Analysts'
      };

      const result = await validator.categorizeFeatures(request);

      const speedFeature = result.categorizedFeatures.find(f => f.featureName === 'Processing Speed');
      expect(speedFeature?.category).toBe('performance');
      expect(speedFeature?.categoryRationale).toContain('Measurable attribute');
    });

    it('should rate products correctly for each category', async () => {
      const request = {
        researchData: {
          products: [
            {
              name: 'Product A',
              features: [
                {
                  name: 'Basic Feature',
                  description: 'Standard implementation',
                  benefit: 'Basic functionality',
                  implementationDetails: 'Simple approach'
                },
                {
                  name: 'Performance Feature',
                  description: 'Speed optimization',
                  benefit: 'Faster processing',
                  implementationDetails: 'Advanced caching',
                  performanceMetrics: '50ms'
                }
              ]
            },
            {
              name: 'Product B',
              features: [
                {
                  name: 'Performance Feature',
                  description: 'Speed feature',
                  benefit: 'Quick response',
                  implementationDetails: 'Basic optimization',
                  performanceMetrics: '150ms'
                }
              ]
            }
          ]
        },
        targetCustomer: 'Developers'
      };

      const result = await validator.categorizeFeatures(request);

      // Check must-have ratings (Yes/No)
      const basicFeature = result.categorizedFeatures.find(f => f.featureName === 'Basic Feature');
      expect(basicFeature?.productRatings['Product A'].rating).toBe('Yes');
      expect(basicFeature?.productRatings['Product B'].rating).toBe('No');

      // Check performance ratings (High/Medium/Low)
      const perfFeature = result.categorizedFeatures.find(f => f.featureName === 'Performance Feature');
      expect(perfFeature?.category).toBe('performance');
      expect(perfFeature?.productRatings['Product A'].rating).toBe('High');
      expect(perfFeature?.productRatings['Product B'].rating).toBe('Low');
      expect(perfFeature?.productRatings['Product A'].justification).toContain('Top 25%');
    });

    it('should handle features with no metrics gracefully', async () => {
      const request = {
        researchData: {
          products: [
            {
              name: 'Product A',
              features: [
                {
                  name: 'Number of Integrations',
                  description: '50+ integrations available',
                  benefit: 'Connect with many tools',
                  implementationDetails: 'Extensive API support'
                }
              ]
            },
            {
              name: 'Product B',
              features: [
                {
                  name: 'Number of Integrations',
                  description: '20 integrations',
                  benefit: 'Basic connectivity',
                  implementationDetails: 'Limited integrations'
                }
              ]
            }
          ]
        },
        targetCustomer: 'Business Users'
      };

      const result = await validator.categorizeFeatures(request);

      const integrationFeature = result.categorizedFeatures.find(f => f.featureName === 'Number of Integrations');
      expect(integrationFeature?.category).toBe('performance');
      
      // Should still rate based on implementation details
      expect(integrationFeature?.productRatings['Product A'].rating).toBe('High');
      expect(integrationFeature?.productRatings['Product B'].rating).toBe('Low');
    });
  });

  describe('edge cases', () => {
    it('should handle empty product list', async () => {
      const request = {
        researchData: {
          products: []
        },
        targetCustomer: 'Users'
      };

      const result = await validator.categorizeFeatures(request);
      expect(result.categorizedFeatures).toHaveLength(0);
      expect(result.summary.totalFeatures).toBe(0);
    });

    it('should handle products with no features', async () => {
      const request = {
        researchData: {
          products: [
            { name: 'Product A', features: [] },
            { name: 'Product B', features: [] }
          ]
        },
        targetCustomer: 'Users'
      };

      const result = await validator.categorizeFeatures(request);
      expect(result.categorizedFeatures).toHaveLength(0);
    });
  });
});