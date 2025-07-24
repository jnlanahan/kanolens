// IMPROVED RESEARCHER - Better feature extraction from Perplexity results

import { searchWithPerplexity } from './researcher';

export interface ExtractedFeature {
  name: string;
  description: string;
  benefit: string;
  category?: 'ai' | 'automation' | 'collaboration' | 'visualization' | 'integration' | 'core';
  isInnovative?: boolean;
  sources: string[];
}

export class ImprovedResearcherAgent {
  
  // Enhanced feature extraction from Perplexity content
  private extractFeaturesFromPerplexityContent(content: string, productName: string): ExtractedFeature[] {
    const features: ExtractedFeature[] = [];
    const extractedNames = new Set<string>();
    
    // 1. Extract AI/ML features (potential delighters)
    const aiPattern = /(?:AI|artificial intelligence|machine learning|smart|intelligent|automated)\s+(?:features?|capabilities?|tools?|workflows?)[^.]*\.?[^.]*\./gi;
    const aiMatches = content.matchAll(aiPattern);
    
    for (const match of aiMatches) {
      const text = match[0];
      const aiFeatures = this.parseAIFeatures(text, productName);
      aiFeatures.forEach(f => {
        if (!extractedNames.has(f.name.toLowerCase())) {
          extractedNames.add(f.name.toLowerCase());
          features.push({ ...f, category: 'ai', isInnovative: true });
        }
      });
    }
    
    // 2. Extract from bullet points and lists
    const bulletPattern = /(?:^|\n)\s*[-•*]\s*\*?\*?([^:]+)\*?\*?:\s*([^.\n]+(?:\.[^.\n]+)?)/gm;
    const bulletMatches = content.matchAll(bulletPattern);
    
    for (const match of bulletMatches) {
      const featureName = this.cleanFeatureName(match[1]);
      const description = match[2].trim();
      
      if (!extractedNames.has(featureName.toLowerCase()) && this.isValidFeatureName(featureName)) {
        extractedNames.add(featureName.toLowerCase());
        features.push({
          name: featureName,
          description: description,
          benefit: this.extractBenefitFromDescription(description),
          category: this.categorizeFeature(featureName, description),
          isInnovative: this.isInnovativeFeature(featureName, description),
          sources: ['Perplexity Research']
        });
      }
    }
    
    // 3. Extract from table rows (for comparison data)
    const tableRowPattern = /\|\s*([^|]+)\s*\|[^|]*\|\s*([^|]+)\s*\|/g;
    const tableMatches = content.matchAll(tableRowPattern);
    
    for (const match of tableMatches) {
      const featureArea = this.cleanFeatureName(match[1]);
      const productCapability = match[2].trim();
      
      if (productCapability.toLowerCase().includes(productName.toLowerCase()) && 
          !extractedNames.has(featureArea.toLowerCase()) &&
          this.isValidFeatureName(featureArea)) {
        
        extractedNames.add(featureArea.toLowerCase());
        features.push({
          name: featureArea,
          description: productCapability,
          benefit: this.extractBenefitFromDescription(productCapability),
          category: this.categorizeFeature(featureArea, productCapability),
          isInnovative: this.isInnovativeFeature(featureArea, productCapability),
          sources: ['Competitive Analysis']
        });
      }
    }
    
    // 4. Extract unique/innovative features mentioned in text
    const uniquePattern = new RegExp(
      `${productName}[^.]*(?:unique|innovative|exclusive|differentiator|stands out|delighter)[^.]*\\.`, 
      'gi'
    );
    const uniqueMatches = content.matchAll(uniquePattern);
    
    for (const match of uniqueMatches) {
      const uniqueFeatures = this.parseUniqueFeatures(match[0], productName);
      uniqueFeatures.forEach(f => {
        if (!extractedNames.has(f.name.toLowerCase())) {
          extractedNames.add(f.name.toLowerCase());
          features.push({ ...f, isInnovative: true });
        }
      });
    }
    
    // 5. Extract standard features from general mentions
    const standardFeatures = [
      { pattern: /task\s+(?:management|tracking|automation)/gi, name: 'Task Management', category: 'core' },
      { pattern: /team\s+collaboration/gi, name: 'Team Collaboration', category: 'collaboration' },
      { pattern: /reporting\s+(?:and\s+)?analytics/gi, name: 'Reporting & Analytics', category: 'core' },
      { pattern: /workflow\s+(?:automation|builder)/gi, name: 'Workflow Automation', category: 'automation' },
      { pattern: /(?:gantt\s+charts?|timeline\s+view)/gi, name: 'Timeline/Gantt View', category: 'visualization' },
      { pattern: /dashboard/gi, name: 'Dashboard', category: 'visualization' },
      { pattern: /integrations?/gi, name: 'Integrations', category: 'integration' },
      { pattern: /mobile\s+app/gi, name: 'Mobile App', category: 'core' },
      { pattern: /(?:real-?time|live)\s+(?:updates?|sync|collaboration)/gi, name: 'Real-time Updates', category: 'collaboration' },
      { pattern: /custom\s+fields?/gi, name: 'Custom Fields', category: 'core' },
      { pattern: /(?:api|developer)\s+(?:access|tools)/gi, name: 'API Access', category: 'integration' },
      { pattern: /notifications?/gi, name: 'Notifications', category: 'core' },
      { pattern: /(?:security|encryption|sso|two-factor)/gi, name: 'Security Features', category: 'core' },
      { pattern: /(?:calendar\s+view|calendar\s+integration)/gi, name: 'Calendar View', category: 'visualization' },
      { pattern: /(?:file\s+sharing|document\s+management)/gi, name: 'File Sharing', category: 'collaboration' },
      { pattern: /time\s+tracking/gi, name: 'Time Tracking', category: 'core' },
      { pattern: /resource\s+management/gi, name: 'Resource Management', category: 'core' },
      { pattern: /portfolio\s+management/gi, name: 'Portfolio Management', category: 'core' },
      { pattern: /goals?\s+(?:tracking|management)/gi, name: 'Goal Tracking', category: 'core' },
      { pattern: /(?:kanban|board\s+view)/gi, name: 'Kanban Board', category: 'visualization' }
    ];
    
    const contentLower = content.toLowerCase();
    const productContext = new RegExp(`${productName}[^.]{0,100}`, 'gi');
    
    for (const { pattern, name, category } of standardFeatures) {
      if (pattern.test(content) && !extractedNames.has(name.toLowerCase())) {
        // Check if feature is mentioned in product context
        const contextMatches = content.matchAll(productContext);
        let isRelevant = false;
        
        for (const contextMatch of contextMatches) {
          if (pattern.test(contextMatch[0])) {
            isRelevant = true;
            break;
          }
        }
        
        if (isRelevant || contentLower.includes(productName.toLowerCase())) {
          extractedNames.add(name.toLowerCase());
          const description = this.findFeatureDescription(content, name, productName);
          features.push({
            name,
            description,
            benefit: this.generateBenefit(name, category as any),
            category: category as any,
            isInnovative: false,
            sources: ['Product Research']
          });
        }
      }
    }
    
    return features;
  }
  
  private parseAIFeatures(text: string, productName: string): ExtractedFeature[] {
    const features: ExtractedFeature[] = [];
    
    // Specific AI feature patterns
    const aiFeaturePatterns = [
      /AI\s+Teammate/gi,
      /Smart\s+\w+/gi,
      /AI\s+Studio/gi,
      /AI\s+workflows?/gi,
      /machine\s+learning\s+\w+/gi,
      /automated\s+insights?/gi,
      /intelligent\s+\w+/gi,
      /predictive\s+\w+/gi,
      /AI-powered\s+\w+/gi,
      /AI\s+assistant/gi,
      /\w+\s+Brain/gi  // For ClickUp Brain
    ];
    
    for (const pattern of aiFeaturePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const featureName = this.cleanFeatureName(match[0]);
        if (this.isValidFeatureName(featureName)) {
          features.push({
            name: featureName,
            description: this.extractSentenceContaining(text, featureName),
            benefit: `Enhances productivity through AI-powered ${featureName.toLowerCase()}`,
            category: 'ai',
            isInnovative: true,
            sources: ['AI Features Research']
          });
        }
      }
    }
    
    return features;
  }
  
  private parseUniqueFeatures(text: string, productName: string): ExtractedFeature[] {
    const features: ExtractedFeature[] = [];
    
    // Extract feature names from unique/innovative mentions
    const words = text.split(/\s+/);
    const featureWords: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      // Look for capitalized phrases or feature-like terms
      if (/^[A-Z]/.test(words[i]) && words[i] !== productName) {
        let feature = words[i];
        // Collect multi-word features
        while (i + 1 < words.length && /^[A-Z]/.test(words[i + 1])) {
          feature += ' ' + words[++i];
        }
        if (this.isValidFeatureName(feature)) {
          featureWords.push(feature);
        }
      }
    }
    
    featureWords.forEach(feature => {
      features.push({
        name: feature,
        description: this.extractSentenceContaining(text, feature),
        benefit: `Provides unique value through ${feature.toLowerCase()}`,
        category: this.categorizeFeature(feature, text),
        isInnovative: true,
        sources: ['Unique Features Analysis']
      });
    });
    
    return features;
  }
  
  private cleanFeatureName(name: string): string {
    return name
      .trim()
      .replace(/^\*+|\*+$/g, '') // Remove asterisks
      .replace(/^[-•]\s*/, '') // Remove bullet points
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/^(the|a|an)\s+/i, '') // Remove articles
      .trim();
  }
  
  private isValidFeatureName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 50) return false;
    
    const invalidPatterns = [
      /^(feature|capability|tool|function)/i,
      /^(includes?|offers?|provides?|supports?)/i,
      /\d{4}/, // Years
      /^(yes|no|high|medium|low)$/i,
      /[|]/  // Table separators
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(name));
  }
  
  private categorizeFeature(name: string, description: string): ExtractedFeature['category'] {
    const text = `${name} ${description}`.toLowerCase();
    
    if (/ai|artificial intelligence|machine learning|smart|intelligent/.test(text)) return 'ai';
    if (/automat|workflow|trigger|rule/.test(text)) return 'automation';
    if (/collaborat|team|share|comment|chat|real-time/.test(text)) return 'collaboration';
    if (/visual|dashboard|chart|timeline|gantt|kanban|board|view/.test(text)) return 'visualization';
    if (/integrat|api|connect|sync|plugin/.test(text)) return 'integration';
    
    return 'core';
  }
  
  private isInnovativeFeature(name: string, description: string): boolean {
    const text = `${name} ${description}`.toLowerCase();
    
    const innovativeIndicators = [
      'ai', 'artificial intelligence', 'machine learning',
      'unique', 'innovative', 'exclusive', 'first',
      'breakthrough', 'revolutionary', 'cutting-edge',
      'smart', 'intelligent', 'predictive', 'automated',
      'patent', 'proprietary', 'game-changing'
    ];
    
    return innovativeIndicators.some(indicator => text.includes(indicator));
  }
  
  private extractBenefitFromDescription(description: string): string {
    // Look for benefit indicators
    const benefitPatterns = [
      /(?:helps?|enables?|allows?|improves?|enhances?|provides?)\s+([^,.]+)/i,
      /(?:for|to)\s+([^,.]+)$/i,
      /(?:resulting in|leads to|creates?)\s+([^,.]+)/i
    ];
    
    for (const pattern of benefitPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Default benefit based on description keywords
    if (/speed|fast|quick|efficient/.test(description)) return 'Improves speed and efficiency';
    if (/easy|simple|intuitive/.test(description)) return 'Simplifies workflow and reduces complexity';
    if (/collaborat|team/.test(description)) return 'Enhances team collaboration';
    if (/automat/.test(description)) return 'Reduces manual work through automation';
    if (/visual|dashboard/.test(description)) return 'Provides better visibility and insights';
    
    return 'Enhances productivity and workflow';
  }
  
  private generateBenefit(featureName: string, category: ExtractedFeature['category']): string {
    const benefits: Record<string, Record<string, string>> = {
      ai: {
        default: 'Leverages AI to enhance productivity and decision-making'
      },
      automation: {
        default: 'Automates repetitive tasks to save time and reduce errors'
      },
      collaboration: {
        default: 'Improves team communication and coordination'
      },
      visualization: {
        default: 'Provides visual insights for better project understanding'
      },
      integration: {
        default: 'Connects with other tools for seamless workflow'
      },
      core: {
        'Task Management': 'Organizes and tracks work efficiently',
        'Security Features': 'Protects sensitive data and ensures compliance',
        'Mobile App': 'Enables productivity on the go',
        'Custom Fields': 'Adapts to specific workflow needs',
        default: 'Provides essential functionality for project management'
      }
    };
    
    return benefits[category || 'core'][featureName] || benefits[category || 'core'].default;
  }
  
  private findFeatureDescription(content: string, featureName: string, productName: string): string {
    // Try to find a sentence mentioning both the product and feature
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(featureName.toLowerCase()) && 
          sentence.toLowerCase().includes(productName.toLowerCase())) {
        return sentence.trim();
      }
    }
    
    // Fallback to any sentence mentioning the feature
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(featureName.toLowerCase())) {
        return sentence.trim();
      }
    }
    
    return `${featureName} capabilities in ${productName}`;
  }
  
  private extractSentenceContaining(text: string, term: string): string {
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(term.toLowerCase())) {
        return sentence.trim();
      }
    }
    
    return `${term} functionality`;
  }
}