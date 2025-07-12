import { describe, it, expect, beforeEach } from 'vitest';
import { AnalystAgent } from '../analyst';

describe('AnalystAgent', () => {
  let analyst: AnalystAgent;

  beforeEach(() => {
    analyst = new AnalystAgent();
  });

  describe('analyzeKanoTable', () => {
    it('should provide comprehensive strategic analysis', async () => {
      const request = {
        kanoTable: {
          products: ['Product A', 'Product B', 'Product C'],
          features: [
            {
              id: 'auth',
              name: 'User Authentication',
              description: 'Login and access control',
              category: 'must-have' as const,
              customerBenefit: 'Essential security'
            },
            {
              id: 'speed',
              name: 'Processing Speed',
              description: 'Fast data processing',
              category: 'performance' as const,
              customerBenefit: 'Better efficiency'
            },
            {
              id: 'ai-assist',
              name: 'AI Assistant',
              description: 'AI-powered help',
              category: 'delighter' as const,
              customerBenefit: 'Enhanced experience'
            }
          ],
          ratings: {
            'auth': { 'Product A': 'Yes', 'Product B': 'Yes', 'Product C': 'No' },
            'speed': { 'Product A': 'High', 'Product B': 'Low', 'Product C': 'Medium' },
            'ai-assist': { 'Product A': 'Yes', 'Product B': 'No', 'Product C': 'No' }
          },
          sources: {}
        },
        targetCustomer: 'Enterprise Teams'
      };

      const result = await analyst.analyzeKanoTable(request);

      // Check market overview
      expect(result.marketOverview.totalFeatures).toBe(3);
      expect(result.marketOverview.categoryBreakdown.mustHaves).toBe(1);
      expect(result.marketOverview.categoryBreakdown.performance).toBe(1);
      expect(result.marketOverview.categoryBreakdown.delighters).toBe(1);
      expect(result.marketOverview.mostFeatureComplete).toBe('Product A');

      // Check key findings
      expect(result.keyFindings.criticalGaps).toContain(
        'Product C missing critical must-have: User Authentication'
      );
      expect(result.keyFindings.competitiveAdvantages).toContain(
        'Product A leads in Processing Speed'
      );
      expect(result.keyFindings.differentiationOpportunities.some(
        opp => opp.includes('AI Assistant') && opp.includes('unique')
      )).toBe(true);

      // Check recommendations
      expect(result.recommendations.immediate.length).toBeGreaterThan(0);
      expect(result.recommendations.shortTerm.length).toBeGreaterThan(0);
      expect(result.recommendations.longTerm.length).toBeGreaterThan(0);
    });

    it('should identify competitive positioning correctly', async () => {
      const request = {
        kanoTable: {
          products: ['Leader', 'Balanced', 'Niche'],
          features: [
            { id: 'f1', name: 'Feature 1', category: 'must-have' as const, description: '', customerBenefit: '' },
            { id: 'f2', name: 'Feature 2', category: 'performance' as const, description: '', customerBenefit: '' },
            { id: 'f3', name: 'Feature 3', category: 'performance' as const, description: '', customerBenefit: '' },
            { id: 'f4', name: 'Feature 4', category: 'performance' as const, description: '', customerBenefit: '' },
            { id: 'f5', name: 'Feature 5', category: 'delighter' as const, description: '', customerBenefit: '' }
          ],
          ratings: {
            'f1': { 'Leader': 'Yes', 'Balanced': 'Yes', 'Niche': 'Yes' },
            'f2': { 'Leader': 'High', 'Balanced': 'Medium', 'Niche': 'Low' },
            'f3': { 'Leader': 'High', 'Balanced': 'High', 'Niche': 'No' },
            'f4': { 'Leader': 'High', 'Balanced': 'Medium', 'Niche': 'No' },
            'f5': { 'Leader': 'No', 'Balanced': 'Yes', 'Niche': 'Yes' }
          },
          sources: {}
        },
        targetCustomer: 'Users'
      };

      const result = await analyst.analyzeKanoTable(request);

      // Leader should be identified as performance leader
      const leaderPosition = result.competitivePositioning.featureLeaders.find(
        fl => fl.product === 'Leader'
      );
      expect(leaderPosition).toBeDefined();
      expect(leaderPosition?.strength).toContain('Performance leader');

      // Balanced should be in balanced competitors
      expect(result.competitivePositioning.balancedCompetitors).toContain('Balanced');
    });

    it('should identify innovation opportunities', async () => {
      const request = {
        kanoTable: {
          products: ['Product A', 'Product B'],
          features: [
            {
              id: 'collab',
              name: 'Real-time Collaboration',
              description: 'Work together in real-time',
              category: 'delighter' as const,
              customerBenefit: 'Team productivity'
            },
            {
              id: 'analytics',
              name: 'Basic Analytics',
              description: 'Simple reporting',
              category: 'performance' as const,
              customerBenefit: 'Data insights'
            }
          ],
          ratings: {
            'collab': { 'Product A': 'Yes', 'Product B': 'Yes' },
            'analytics': { 'Product A': 'Medium', 'Product B': 'Medium' }
          },
          sources: {}
        },
        targetCustomer: 'Teams'
      };

      const result = await analyst.analyzeKanoTable(request);

      // Should identify market gaps
      expect(result.innovationOpportunities.marketGaps.length).toBeGreaterThan(0);
      const hasAIGap = result.innovationOpportunities.marketGaps.some(
        gap => gap.toLowerCase().includes('ai')
      );
      expect(hasAIGap).toBe(true);

      // Should identify emerging trends
      expect(result.innovationOpportunities.emergingTrends.some(
        trend => trend.includes('Real-time Collaboration') && trend.includes('gaining adoption')
      )).toBe(true);

      // Should suggest blue ocean opportunities
      expect(result.innovationOpportunities.blueOcean.length).toBeGreaterThan(0);
    });

    it('should handle edge cases gracefully', async () => {
      const request = {
        kanoTable: {
          products: ['Only Product'],
          features: [
            {
              id: 'feature1',
              name: 'Feature 1',
              description: 'Single feature',
              category: 'must-have' as const,
              customerBenefit: 'Basic need'
            }
          ],
          ratings: {
            'feature1': { 'Only Product': 'Yes' }
          },
          sources: {}
        },
        targetCustomer: 'Users'
      };

      const result = await analyst.analyzeKanoTable(request);

      // Should handle single product/feature
      expect(result.marketOverview.mostFeatureComplete).toBe('Only Product');
      expect(result.marketOverview.totalFeatures).toBe(1);
      
      // Should provide generic recommendations when specific ones aren't available
      expect(result.recommendations.immediate.length).toBeGreaterThan(0);
      expect(result.recommendations.immediate[0]).toContain('Ensure all must-have features');
    });

    it('should prioritize recommendations correctly', async () => {
      const request = {
        kanoTable: {
          products: ['Product A', 'Product B'],
          features: [
            {
              id: 'critical',
              name: 'Critical Feature',
              description: 'Must have this',
              category: 'must-have' as const,
              customerBenefit: 'Essential'
            },
            {
              id: 'perf',
              name: 'Performance Feature',
              description: 'Speed matters',
              category: 'performance' as const,
              customerBenefit: 'Efficiency'
            },
            {
              id: 'nice',
              name: 'Nice Feature',
              description: 'Would be nice',
              category: 'delighter' as const,
              customerBenefit: 'Wow factor'
            }
          ],
          ratings: {
            'critical': { 'Product A': 'No', 'Product B': 'Yes' },
            'perf': { 'Product A': 'Low', 'Product B': 'High' },
            'nice': { 'Product A': 'No', 'Product B': 'Yes' }
          },
          sources: {}
        },
        targetCustomer: 'Business Users'
      };

      const result = await analyst.analyzeKanoTable(request);

      // Immediate should focus on must-have gaps
      expect(result.recommendations.immediate.some(
        rec => rec.includes('Critical Feature')
      )).toBe(true);

      // Short-term should focus on performance improvements
      expect(result.recommendations.shortTerm.some(
        rec => rec.includes('Performance Feature')
      )).toBe(true);

      // Long-term should focus on delighters
      expect(result.recommendations.longTerm.some(
        rec => rec.includes('Nice Feature') || rec.includes('differentiation')
      )).toBe(true);
    });
  });
});