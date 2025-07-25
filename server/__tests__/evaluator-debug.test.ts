// Debug test for evaluator agent
import { describe, it, expect } from 'vitest';

describe('Evaluator Debug', () => {
  it('should show evaluator module exports', async () => {
    const evaluatorModule = await import('../agents/evaluator');
    console.error('Evaluator module keys:', Object.keys(evaluatorModule));
    console.error('evaluatorAgent:', evaluatorModule.evaluatorAgent);
    console.error('evaluatorAgent type:', typeof evaluatorModule.evaluatorAgent);
    
    if (evaluatorModule.evaluatorAgent) {
      console.error('evaluatorAgent methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(evaluatorModule.evaluatorAgent)));
    }
    
    expect(evaluatorModule).toBeDefined();
  });
});