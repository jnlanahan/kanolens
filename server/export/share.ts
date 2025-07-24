import { randomBytes } from 'crypto';
import type { AnalysisSession } from '@shared/schema';
import { storage } from '../storage';

export interface ShareData {
  url: string;
  shareId: string;
  expiresAt: Date;
}

export interface SharedAnalysis {
  title: string;
  products: string[];
  targetCustomer: string;
  tableData: any;
  createdAt: string;
  sharedAt: string;
  isPublic: boolean;
}

export async function generateShareLink(session: AnalysisSession): Promise<ShareData> {
  // Generate a secure random share ID
  const shareId = randomBytes(32).toString('hex');
  
  // Set expiration to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Store the shared analysis data
  await storage.createSharedAnalysis({
    shareId,
    sessionId: session.id,
    userId: session.userId,
    title: session.title,
    products: session.products || [],
    targetCustomer: session.targetCustomer || '',
    tableData: session.tableData,
    expiresAt,
    isActive: true,
    createdAt: new Date()
  });

  // Generate the public URL
  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
  const shareUrl = `${baseUrl}/share/${shareId}`;

  return {
    url: shareUrl,
    shareId,
    expiresAt
  };
}

export async function getSharedAnalysis(shareId: string): Promise<SharedAnalysis | null> {
  try {
    const sharedData = await storage.getSharedAnalysis(shareId);
    
    if (!sharedData) {
      return null;
    }

    // Check if the share link has expired
    if (new Date() > new Date(sharedData.expiresAt)) {
      // Optionally deactivate expired shares
      await storage.updateSharedAnalysis(shareId, { isActive: false });
      return null;
    }

    // Return sanitized data (no user information)
    return {
      title: sharedData.title,
      products: sharedData.products,
      targetCustomer: sharedData.targetCustomer,
      tableData: sharedData.tableData,
      createdAt: sharedData.createdAt.toISOString(),
      sharedAt: sharedData.createdAt.toISOString(), // When the share was created
      isPublic: true
    };
  } catch (error) {
    console.error('Error fetching shared analysis:', error);
    return null;
  }
}

export async function revokeShareLink(shareId: string, userId: string): Promise<boolean> {
  try {
    const sharedData = await storage.getSharedAnalysis(shareId);
    
    if (!sharedData || sharedData.userId !== userId) {
      return false;
    }

    await storage.updateSharedAnalysis(shareId, { isActive: false });
    return true;
  } catch (error) {
    console.error('Error revoking share link:', error);
    return false;
  }
}

export async function getUserSharedAnalyses(userId: string): Promise<any[]> {
  try {
    return await storage.getUserSharedAnalyses(userId);
  } catch (error) {
    console.error('Error fetching user shared analyses:', error);
    return [];
  }
}