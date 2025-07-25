// Phase 5: Bundle Size Analysis Script
// Analyzes and reports on frontend bundle size and composition

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 Starting Bundle Size Analysis...\n');

// Configuration
const CONFIG = {
  buildDir: path.resolve(__dirname, '../dist/public'),
  reportDir: path.resolve(__dirname, '../reports'),
  thresholds: {
    totalSize: 2 * 1024 * 1024, // 2MB total
    jsChunkSize: 512 * 1024,    // 512KB per JS chunk
    cssSize: 100 * 1024,        // 100KB total CSS
    assetSize: 1024 * 1024      // 1MB for assets
  }
};

async function analyzeBundleSize() {
  try {
    // Ensure reports directory exists
    if (!fs.existsSync(CONFIG.reportDir)) {
      fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    }

    console.log('🔨 Building production bundle...');
    
    // Build the project
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });

    console.log('\n📊 Analyzing bundle...');

    // Analyze the build output
    const analysis = await analyzeBuildOutput();
    
    // Generate report
    const report = generateReport(analysis);
    
    // Save report
    saveReport(report);
    
    // Display results
    displayResults(report);
    
    // Check thresholds
    checkThresholds(analysis);

  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

async function analyzeBuildOutput() {
  const buildPath = CONFIG.buildDir;
  
  if (!fs.existsSync(buildPath)) {
    throw new Error(`Build directory not found: ${buildPath}`);
  }

  const analysis = {
    totalSize: 0,
    files: [],
    byType: {
      js: { count: 0, size: 0, files: [] },
      css: { count: 0, size: 0, files: [] },
      html: { count: 0, size: 0, files: [] },
      assets: { count: 0, size: 0, files: [] }
    },
    chunks: [],
    dependencies: []
  };

  // Recursively analyze all files
  function analyzeDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativeFilePath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        analyzeDirectory(fullPath, relativeFilePath);
      } else {
        const fileInfo = analyzeFile(fullPath, relativeFilePath, stats);
        analysis.files.push(fileInfo);
        analysis.totalSize += fileInfo.size;
        
        // Categorize by type
        const category = getFileCategory(fileInfo.name);
        analysis.byType[category].count++;
        analysis.byType[category].size += fileInfo.size;
        analysis.byType[category].files.push(fileInfo);
      }
    }
  }

  analyzeDirectory(buildPath);
  
  // Sort files by size (largest first)
  analysis.files.sort((a, b) => b.size - a.size);
  
  // Identify chunks
  analysis.chunks = analysis.byType.js.files
    .filter(file => file.name.includes('chunk') || file.name.includes('vendor'))
    .sort((a, b) => b.size - a.size);

  return analysis;
}

function analyzeFile(fullPath, relativePath, stats) {
  const extension = path.extname(relativePath);
  const name = path.basename(relativePath);
  
  const fileInfo = {
    name,
    path: relativePath,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    extension,
    type: getFileCategory(name),
    hash: name.match(/\.[a-f0-9]{8,}\./)?.[0] || null
  };

  // Try to get gzipped size for text files
  if (['.js', '.css', '.html', '.json'].includes(extension)) {
    try {
      const content = fs.readFileSync(fullPath);
      const { gzipSize } = require('gzip-size');
      fileInfo.gzippedSize = gzipSize.sync(content);
      fileInfo.gzippedSizeFormatted = formatBytes(fileInfo.gzippedSize);
    } catch (error) {
      // Fallback if gzip-size is not available
      fileInfo.gzippedSize = Math.floor(fileInfo.size * 0.7); // Estimate
      fileInfo.gzippedSizeFormatted = formatBytes(fileInfo.gzippedSize);
    }
  }

  return fileInfo;
}

function getFileCategory(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.js', '.mjs', '.jsx', '.ts', '.tsx'].includes(ext)) return 'js';
  if (['.css', '.scss', '.sass', '.less'].includes(ext)) return 'css';
  if (['.html', '.htm'].includes(ext)) return 'html';
  return 'assets';
}

function generateReport(analysis) {
  return {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    summary: {
      totalFiles: analysis.files.length,
      totalSize: analysis.totalSize,
      totalSizeFormatted: formatBytes(analysis.totalSize),
      totalGzippedSize: analysis.files.reduce((sum, file) => sum + (file.gzippedSize || 0), 0)
    },
    byType: Object.entries(analysis.byType).reduce((acc, [type, data]) => {
      acc[type] = {
        count: data.count,
        size: data.size,
        sizeFormatted: formatBytes(data.size),
        percentage: ((data.size / analysis.totalSize) * 100).toFixed(1),
        gzippedSize: data.files.reduce((sum, file) => sum + (file.gzippedSize || 0), 0)
      };
      acc[type].gzippedSizeFormatted = formatBytes(acc[type].gzippedSize);
      return acc;
    }, {}),
    largestFiles: analysis.files.slice(0, 10),
    jsChunks: analysis.chunks.slice(0, 5),
    recommendations: generateRecommendations(analysis),
    thresholdChecks: checkAllThresholds(analysis)
  };
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  // Check for large JavaScript files
  const largeJsFiles = analysis.byType.js.files.filter(file => file.size > CONFIG.thresholds.jsChunkSize);
  if (largeJsFiles.length > 0) {
    recommendations.push({
      type: 'optimization',
      priority: 'high',
      message: `${largeJsFiles.length} JavaScript files exceed ${formatBytes(CONFIG.thresholds.jsChunkSize)}`,
      suggestion: 'Consider code splitting, dynamic imports, or tree shaking'
    });
  }
  
  // Check for missing code splitting
  const mainJsFile = analysis.byType.js.files.find(file => 
    file.name.includes('index') || file.name.includes('main')
  );
  if (mainJsFile && mainJsFile.size > 300 * 1024) {
    recommendations.push({
      type: 'code-splitting',
      priority: 'medium',
      message: 'Main JavaScript bundle is large',
      suggestion: 'Implement route-based code splitting and lazy loading'
    });
  }
  
  // Check for duplicate dependencies
  const jsFiles = analysis.byType.js.files;
  if (jsFiles.filter(file => file.name.includes('vendor')).length > 1) {
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: 'Multiple vendor bundles detected',
      suggestion: 'Consider optimizing dependency bundling strategy'
    });
  }
  
  // Check CSS size
  if (analysis.byType.css.size > CONFIG.thresholds.cssSize) {
    recommendations.push({
      type: 'css-optimization',
      priority: 'low',
      message: 'CSS bundle size is large',
      suggestion: 'Consider CSS purging, critical CSS extraction, or CSS-in-JS optimization'
    });
  }
  
  // Performance recommendations
  if (analysis.totalSize > CONFIG.thresholds.totalSize) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: 'Total bundle size exceeds recommended threshold',
      suggestion: 'Implement aggressive optimization: tree shaking, minification, compression'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      priority: 'info',
      message: 'Bundle size is within recommended limits',
      suggestion: 'Continue monitoring bundle size as the application grows'
    });
  }

  return recommendations;
}

function checkAllThresholds(analysis) {
  return {
    totalSize: {
      current: analysis.totalSize,
      threshold: CONFIG.thresholds.totalSize,
      passed: analysis.totalSize <= CONFIG.thresholds.totalSize,
      message: `Total bundle size: ${formatBytes(analysis.totalSize)} (limit: ${formatBytes(CONFIG.thresholds.totalSize)})`
    },
    jsChunks: {
      current: Math.max(...analysis.byType.js.files.map(f => f.size), 0),
      threshold: CONFIG.thresholds.jsChunkSize,
      passed: analysis.byType.js.files.every(f => f.size <= CONFIG.thresholds.jsChunkSize),
      message: `Largest JS chunk: ${formatBytes(Math.max(...analysis.byType.js.files.map(f => f.size), 0))}`
    },
    cssSize: {
      current: analysis.byType.css.size,
      threshold: CONFIG.thresholds.cssSize,
      passed: analysis.byType.css.size <= CONFIG.thresholds.cssSize,
      message: `Total CSS size: ${formatBytes(analysis.byType.css.size)}`
    }
  };
}

function checkThresholds(analysis) {
  const checks = checkAllThresholds(analysis);
  let hasFailures = false;
  
  console.log('\n🎯 Threshold Checks:');
  console.log('==================');
  
  Object.entries(checks).forEach(([check, result]) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.message}`);
    if (!result.passed) hasFailures = true;
  });
  
  if (hasFailures) {
    console.log('\n⚠️  Some thresholds exceeded. See recommendations above.');
  } else {
    console.log('\n✨ All thresholds passed!');
  }
}

function saveReport(report) {
  const reportPath = path.join(CONFIG.reportDir, `bundle-analysis-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  const latestPath = path.join(CONFIG.reportDir, 'latest-bundle-analysis.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  
  console.log(`💾 Report saved to: ${reportPath}`);
}

function displayResults(report) {
  console.log('\n📊 Bundle Analysis Results:');
  console.log('===========================');
  console.log(`Total Files: ${report.summary.totalFiles}`);
  console.log(`Total Size: ${report.summary.totalSizeFormatted}`);
  console.log(`Gzipped Size: ${formatBytes(report.summary.totalGzippedSize)}`);
  
  console.log('\n📂 By File Type:');
  Object.entries(report.byType).forEach(([type, data]) => {
    if (data.count > 0) {
      console.log(`  ${type.toUpperCase()}: ${data.count} files, ${data.sizeFormatted} (${data.percentage}%)`);
    }
  });
  
  console.log('\n📈 Largest Files:');
  report.largestFiles.slice(0, 5).forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}: ${file.sizeFormatted}`);
  });
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priority} ${rec.message}`);
      console.log(`     ${rec.suggestion}`);
    });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Run the analysis
analyzeBundleSize().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});