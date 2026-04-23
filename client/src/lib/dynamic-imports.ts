import { lazy } from 'react';

// Lazy load heavy components that aren't needed immediately
export const AgentArchitectureDiagram = lazy(() => import('@/components/AgentArchitectureDiagram'));
export const KanoTable = lazy(() => import('@/components/KanoTable/KanoTable'));

// Lazy load pages that aren't on critical path
export const AdminPage = lazy(() => import('@/pages/Admin'));
export const DebugPage = lazy(() => import('@/pages/Debug'));
export const AccountSettingsPage = lazy(() => import('@/pages/AccountSettings'));

// Chart components can be lazy loaded
export const ChartComponents = {
  BarChart: lazy(() => import('recharts').then(m => ({ default: m.BarChart }))),
  LineChart: lazy(() => import('recharts').then(m => ({ default: m.LineChart }))),
  PieChart: lazy(() => import('recharts').then(m => ({ default: m.PieChart }))),
  RadarChart: lazy(() => import('recharts').then(m => ({ default: m.RadarChart }))),
};

// PDF and PowerPoint generation libraries
export const pdfGeneration = () => import('pdfkit');
export const pptxGeneration = () => import('pptxgenjs');
export const xlsxGeneration = () => import('xlsx');

// Heavy UI components that aren't critical
export const heavyUIComponents = {
  Calendar: lazy(() => import('@/components/ui/calendar').then(m => ({ default: m.Calendar }))),
};