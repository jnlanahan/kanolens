// Progress tracking logic for analysis workflows
import { webSocketService } from "../websocket";

export interface ProgressUpdate {
  step: 'discovery' | 'research' | 'categorization' | 'table_creation' | 'analysis';
  message: string;
  progress: number;
  data?: any;
  timestamp?: string;
  sessionId?: number;
}

export interface ProgressState {
  currentStep: string;
  progress: number;
  startTime: Date;
  lastUpdate: Date;
  updates: ProgressUpdate[];
  sessionId?: number;
}

export class ProgressTracker {
  private states: Map<number, ProgressState> = new Map();

  // Create a new progress tracking session
  createSession(sessionId: number): ProgressState {
    const state: ProgressState = {
      currentStep: 'discovery',
      progress: 0,
      startTime: new Date(),
      lastUpdate: new Date(),
      updates: [],
      sessionId
    };
    
    this.states.set(sessionId, state);
    console.log(`[ProgressTracker] Created session ${sessionId}`);
    return state;
  }

  // Update progress for a session
  updateProgress(sessionId: number, update: ProgressUpdate): void {
    const state = this.states.get(sessionId);
    if (!state) {
      console.warn(`[ProgressTracker] Session ${sessionId} not found, creating new one`);
      this.createSession(sessionId);
      return this.updateProgress(sessionId, update);
    }

    // Add timestamp to update
    const timestampedUpdate: ProgressUpdate = {
      ...update,
      timestamp: new Date().toISOString(),
      sessionId
    };

    // Update state
    state.currentStep = update.step;
    state.progress = update.progress;
    state.lastUpdate = new Date();
    state.updates.push(timestampedUpdate);

    console.log(`[ProgressTracker] Session ${sessionId}: ${update.step} - ${update.progress}% - ${update.message}`);

    // Broadcast to WebSocket clients
    try {
      webSocketService.broadcastProgress(sessionId, timestampedUpdate);
    } catch (error) {
      console.warn(`[ProgressTracker] Failed to broadcast progress for session ${sessionId}:`, error);
    }
  }

  // Mark session as completed
  completeSession(sessionId: number, finalData?: any): void {
    const state = this.states.get(sessionId);
    if (!state) {
      console.warn(`[ProgressTracker] Cannot complete session ${sessionId} - not found`);
      return;
    }

    const completionUpdate: ProgressUpdate = {
      step: 'analysis',
      message: 'Analysis completed successfully!',
      progress: 100,
      data: finalData,
      timestamp: new Date().toISOString(),
      sessionId
    };

    this.updateProgress(sessionId, completionUpdate);

    // Broadcast completion
    try {
      webSocketService.broadcastComplete(sessionId, {
        success: true,
        data: finalData,
        totalTime: Date.now() - state.startTime.getTime(),
        updates: state.updates.length
      });
    } catch (error) {
      console.warn(`[ProgressTracker] Failed to broadcast completion for session ${sessionId}:`, error);
    }

    console.log(`[ProgressTracker] Session ${sessionId} completed in ${Date.now() - state.startTime.getTime()}ms`);
  }

  // Mark session as failed
  failSession(sessionId: number, error: string | Error): void {
    const state = this.states.get(sessionId);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const failureUpdate: ProgressUpdate = {
      step: 'analysis',
      message: `Analysis failed: ${errorMessage}`,
      progress: 0,
      timestamp: new Date().toISOString(),
      sessionId
    };

    if (state) {
      this.updateProgress(sessionId, failureUpdate);
    }

    // Broadcast error
    try {
      webSocketService.broadcastError(sessionId, {
        error: errorMessage,
        message: 'Analysis failed. Please try again.',
        timestamp: new Date().toISOString()
      });
    } catch (broadcastError) {
      console.warn(`[ProgressTracker] Failed to broadcast error for session ${sessionId}:`, broadcastError);
    }

    console.error(`[ProgressTracker] Session ${sessionId} failed: ${errorMessage}`);
  }

  // Get current state for a session
  getState(sessionId: number): ProgressState | undefined {
    return this.states.get(sessionId);
  }

  // Get progress percentage for current step
  getStepProgress(step: string): number {
    const stepMap = {
      'discovery': 0,
      'research': 25,
      'categorization': 50,
      'analysis': 75,
      'table_creation': 90
    };
    return stepMap[step as keyof typeof stepMap] || 0;
  }

  // Calculate estimated time remaining
  estimateTimeRemaining(sessionId: number): number | null {
    const state = this.states.get(sessionId);
    if (!state || state.progress === 0) {
      return null;
    }

    const elapsed = Date.now() - state.startTime.getTime();
    const estimatedTotal = elapsed / (state.progress / 100);
    return Math.max(0, estimatedTotal - elapsed);
  }

  // Clean up old sessions (call periodically)
  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const sessionsToDelete: number[] = [];

    for (const [sessionId, state] of this.states.entries()) {
      const age = now - state.startTime.getTime();
      if (age > maxAgeMs) {
        sessionsToDelete.push(sessionId);
      }
    }

    for (const sessionId of sessionsToDelete) {
      this.states.delete(sessionId);
      console.log(`[ProgressTracker] Cleaned up old session ${sessionId}`);
    }

    if (sessionsToDelete.length > 0) {
      console.log(`[ProgressTracker] Cleaned up ${sessionsToDelete.length} old sessions`);
    }
  }

  // Get summary of all active sessions
  getActiveSessions(): Array<{ sessionId: number; step: string; progress: number; age: number }> {
    const now = Date.now();
    return Array.from(this.states.entries()).map(([sessionId, state]) => ({
      sessionId,
      step: state.currentStep,
      progress: state.progress,
      age: now - state.startTime.getTime()
    }));
  }

  // Create a progress callback function for a session
  createProgressCallback(sessionId: number): (update: ProgressUpdate) => void {
    return (update: ProgressUpdate) => {
      this.updateProgress(sessionId, update);
    };
  }
}

// Create singleton instance
export const progressTracker = new ProgressTracker();

// Auto-cleanup every hour
setInterval(() => {
  progressTracker.cleanupOldSessions();
}, 60 * 60 * 1000);