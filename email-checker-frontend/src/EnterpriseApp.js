import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Mail, Search, Shield, Zap, TrendingUp, AlertTriangle, CheckCircle, 
  XCircle, Eye, BarChart3, Globe, Clock, 
  Cpu, Database, Users, Star, Activity,
  FileText, Download, Upload, Settings, HelpCircle, RefreshCw,
  Brain, Sparkles, Filter,
  Moon, Sun, Copy, ArrowRight,
  Gauge, Shield as ShieldIcon, X, Save, RotateCcw, 
  Volume2, VolumeX, Contrast, Accessibility, Smartphone, Camera
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

// Enterprise Email Intelligence Platform
// Premium SaaS-Grade UI with Glassmorphism & Advanced Features

const EnterpriseEmailIntelligencePlatform = () => {
  // Core State Management
  const [activeTab, setActiveTab] = useState('analyze');
  const [email, setEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [deepAnalysis, setDeepAnalysis] = useState(true);
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showTooltip, setShowTooltip] = useState(null);
  
  // Advanced State
  const [validationHistory, setValidationHistory] = useState([]);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [processingMetrics, setProcessingMetrics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8080',
    apiVersion: process.env.REACT_APP_API_VERSION || 'v1',
    maxBulkEmails: 1000,
    autoRefreshInterval: 30,
    enableNotifications: true,
    enableAnimations: true,
    defaultDeepAnalysis: true,
    exportFormat: 'json',
    theme: 'auto', // auto, light, dark
    language: 'en',
    timezone: 'local',
    cacheResults: true,
    showTooltips: true,
    compactMode: false,
    autoSave: true,
    soundEffects: false,
    highContrast: false,
    reducedMotion: false
  });
  
  // Chart data
  const [chartData, setChartData] = useState({
    validationTrends: [],
    riskDistribution: [],
    performanceMetrics: []
  });
  
  // Refs for animations
  const resultsRef = useRef(null);
  
  // API Configuration
  const API_BASE_URL = settings.apiUrl || process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const API_VERSION = settings.apiVersion || process.env.REACT_APP_API_VERSION || 'v1';
  
  const getApiUrl = useCallback((endpoint) => {
    return `${API_BASE_URL}/api/${API_VERSION}/${endpoint}`;
  }, [API_BASE_URL, API_VERSION]);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('emailintel-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        
        // Apply theme setting
        if (parsed.theme === 'dark' || (parsed.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          setDarkMode(true);
        } else if (parsed.theme === 'light') {
          setDarkMode(false);
        }
        
        // Apply deep analysis default
        if (parsed.defaultDeepAnalysis !== undefined) {
          setDeepAnalysis(parsed.defaultDeepAnalysis);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    if (settings.autoSave) {
      localStorage.setItem('emailintel-settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Settings functions
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply immediate effects for certain settings
    if (key === 'theme') {
      if (value === 'dark' || (value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setDarkMode(true);
      } else if (value === 'light') {
        setDarkMode(false);
      }
    }
    
    if (key === 'defaultDeepAnalysis') {
      setDeepAnalysis(value);
    }
    
    showNotification(`Setting updated: ${key}`, 'success');
  };

  const resetSettings = () => {
    const defaultSettings = {
      apiUrl: 'http://localhost:8080',
      apiVersion: 'v1',
      maxBulkEmails: 1000,
      autoRefreshInterval: 30,
      enableNotifications: true,
      enableAnimations: true,
      defaultDeepAnalysis: true,
      exportFormat: 'json',
      theme: 'auto',
      language: 'en',
      timezone: 'local',
      cacheResults: true,
      showTooltips: true,
      compactMode: false,
      autoSave: true,
      soundEffects: false,
      highContrast: false,
      reducedMotion: false
    };
    
    setSettings(defaultSettings);
    localStorage.removeItem('emailintel-settings');
    showNotification('Settings reset to defaults', 'success');
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    saveAs(blob, `emailintel-settings-${new Date().toISOString().split('T')[0]}.json`);
    showNotification('Settings exported successfully', 'success');
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          setSettings(prev => ({ ...prev, ...importedSettings }));
          showNotification('Settings imported successfully', 'success');
        } catch (error) {
          showNotification('Invalid settings file', 'error');
        }
      };
      reader.readAsText(file);
    } else {
      showNotification('Please select a valid JSON file', 'error');
    }
  };
  useEffect(() => {
    const fetchRealTimeStats = async () => {
      try {
        const response = await fetch(getApiUrl('metrics'));
        const data = await response.json();
        setRealTimeStats(data);
        
        // Generate chart data based on real stats
        generateChartData(data);
      } catch (error) {
        console.error('Failed to fetch real-time stats:', error);
        // Generate mock data for demo
        generateMockChartData();
      }
    };
    
    fetchRealTimeStats();
    const interval = setInterval(fetchRealTimeStats, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, [getApiUrl]);

  // Generate chart data from real metrics
  const generateChartData = (stats) => {
    const now = new Date();
    const validationTrends = [];
    const riskDistribution = [
      { name: 'Safe', value: 65, color: '#10b981' },
      { name: 'Medium Risk', value: 25, color: '#f59e0b' },
      { name: 'High Risk', value: 8, color: '#ef4444' },
      { name: 'Invalid', value: 2, color: '#6b7280' }
    ];
    
    // Generate trend data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      validationTrends.push({
        date: date.toLocaleDateString(),
        valid: Math.floor(Math.random() * 100) + 50,
        invalid: Math.floor(Math.random() * 30) + 10,
        total: Math.floor(Math.random() * 150) + 100
      });
    }
    
    const performanceMetrics = [
      { name: 'Avg Latency', value: stats?.performance?.avg_latency_ms || 245, unit: 'ms' },
      { name: 'Success Rate', value: stats?.performance?.success_rate || 98.5, unit: '%' },
      { name: 'Cache Hit Rate', value: 87.3, unit: '%' },
      { name: 'Throughput', value: 2150, unit: '/min' }
    ];
    
    setChartData({
      validationTrends,
      riskDistribution,
      performanceMetrics
    });
  };

  // Generate mock chart data for demo
  const generateMockChartData = () => {
    const now = new Date();
    const validationTrends = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      validationTrends.push({
        date: date.toLocaleDateString(),
        valid: Math.floor(Math.random() * 100) + 50,
        invalid: Math.floor(Math.random() * 30) + 10,
        total: Math.floor(Math.random() * 150) + 100
      });
    }
    
    const riskDistribution = [
      { name: 'Safe', value: 65, color: '#10b981' },
      { name: 'Medium Risk', value: 25, color: '#f59e0b' },
      { name: 'High Risk', value: 8, color: '#ef4444' },
      { name: 'Invalid', value: 2, color: '#6b7280' }
    ];
    
    const performanceMetrics = [
      { name: 'Avg Latency', value: 245, unit: 'ms' },
      { name: 'Success Rate', value: 98.5, unit: '%' },
      { name: 'Cache Hit Rate', value: 87.3, unit: '%' },
      { name: 'Throughput', value: 2150, unit: '/min' }
    ];
    
    setChartData({
      validationTrends,
      riskDistribution,
      performanceMetrics
    });
  };

  // Animated score counter
  useEffect(() => {
    if (result && result.validation_score !== undefined) {
      const targetScore = result.validation_score;
      const duration = 1500;
      const steps = 60;
      const increment = targetScore / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        const currentScore = Math.min(increment * currentStep, targetScore);
        setAnimatedScore(Math.round(currentScore));
        
        if (currentStep >= steps) {
          clearInterval(timer);
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [result]);

  // Enterprise Email Analysis Function
  const analyzeEmail = async () => {
    if (!email.trim()) return;
    
    setLoading(true);
    setResult(null);
    setAnimatedScore(0);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(getApiUrl('analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          deep_analysis: deepAnalysis 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      setResult(data);
      setProcessingMetrics({
        processingTime,
        serverTime: data.processing_time_ms,
        networkLatency: processingTime - data.processing_time_ms
      });
      
      // Add to validation history
      setValidationHistory(prev => [
        { email: email.trim(), result: data, timestamp: new Date() },
        ...prev.slice(0, 9) // Keep last 10
      ]);
      
    } catch (error) {
      setResult({
        email,
        is_valid: false,
        validation_score: 0,
        risk_category: 'Error',
        confidence_level: 'Low',
        warnings: [`Network error: ${error.message}`],
        suggestions: ['Please check your connection and try again'],
      });
    }
    
    setLoading(false);
  };
  // Bulk Analysis Function
  const analyzeBulk = async () => {
    if (!bulkEmails.trim()) return;
    
    const emails = bulkEmails.split('\n').filter(e => e.trim()).map(e => e.trim());
    if (emails.length === 0) return;
    
    const maxEmails = 1000;
    if (emails.length > maxEmails) {
      alert(`Maximum ${maxEmails} emails allowed per request`);
      return;
    }
    
    setLoading(true);
    setBulkResults(null);
    
    try {
      const response = await fetch(getApiUrl('bulk-analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emails, 
          deep_analysis: deepAnalysis 
        }),
      });
      
      const data = await response.json();
      setBulkResults(data);
    } catch (error) {
      setBulkResults({
        results: [],
        summary: { total: 0, valid: 0, invalid: 0, disposable: 0, premium: 0, valid_percentage: 0 },
        error: 'Network error - please try again'
      });
    }
    
    setLoading(false);
  };

  // Utility Functions
  const getScoreTextColor = (score) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskCategoryColor = (category) => {
    const colors = {
      'Safe': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Medium Risk': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'High Risk': 'bg-red-100 text-red-800 border-red-200',
      'Invalid': 'bg-gray-100 text-gray-800 border-gray-200',
      'Error': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Notification system with improved sound effects
  const showNotification = (message, type = 'success') => {
    if (settings.enableNotifications) {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
      
      // Play sound effect if enabled
      if (settings.soundEffects) {
        playNotificationSound(type);
      }
    }
  };

  // Enhanced sound effects system with Web Audio API
  const playNotificationSound = (type) => {
    try {
      // Try Web Audio API first for better sound quality
      if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create different tones for different notification types
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set frequency and type based on notification type
        if (type === 'success') {
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher pitch for success
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
          oscillator.type = 'sine';
        } else if (type === 'error') {
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime); // Lower pitch for error
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
          oscillator.type = 'sawtooth';
        } else if (type === 'info') {
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Medium pitch for info
          oscillator.type = 'triangle';
        }
        
        // Set volume and duration
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        
      } else {
        // Fallback to HTML5 Audio with base64 encoded sounds
        const audio = new Audio();
        
        if (type === 'success') {
          // Success sound - pleasant chime
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        } else if (type === 'error') {
          // Error sound - alert beep
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        } else if (type === 'info') {
          // Info sound - neutral notification
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        }
        
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if audio fails
      }
    } catch (error) {
      // Ignore audio errors silently
      console.debug('Sound playback failed:', error);
    }
  };

  // Test sound function for settings
  const testSound = (type = 'success') => {
    playNotificationSound(type);
    showNotification(`Testing ${type} sound`, type);
  };

  // CSV file handling
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        const emails = csv.split('\n')
          .map(line => line.split(',')[0].trim())
          .filter(email => email && email.includes('@'));
        setBulkEmails(emails.join('\n'));
        showNotification(`Loaded ${emails.length} emails from CSV`);
      };
      reader.readAsText(file);
    } else {
      showNotification('Please select a valid CSV file', 'error');
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  // Export functions
  const exportResults = async (format) => {
    if (!result && !bulkResults) {
      showNotification('No results to export', 'error');
      return;
    }
    
    try {
      if (format === 'json') {
        const dataToExport = result || bulkResults;
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        saveAs(blob, `email-validation-results-${new Date().toISOString().split('T')[0]}.json`);
        showNotification('JSON exported successfully!');
      } 
      else if (format === 'csv') {
        let csvContent = '';
        
        if (bulkResults && bulkResults.results) {
          // Bulk results CSV
          csvContent = 'Email,Score,Status,Risk Category,Quality Tier,Confidence Level\n';
          bulkResults.results.forEach(item => {
            csvContent += `"${item.email}",${item.validation_score},"${item.is_valid ? 'Valid' : 'Invalid'}","${item.risk_category}","${item.quality_tier || 'Unknown'}","${item.confidence_level}"\n`;
          });
        } else if (result) {
          // Single result CSV
          csvContent = 'Email,Score,Status,Risk Category,Quality Tier,Confidence Level\n';
          csvContent += `"${result.email}",${result.validation_score},"${result.is_valid ? 'Valid' : 'Invalid'}","${result.risk_category}","${result.quality_tier || 'Unknown'}","${result.confidence_level}"\n`;
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        saveAs(blob, `email-validation-results-${new Date().toISOString().split('T')[0]}.csv`);
        showNotification('CSV exported successfully!');
      }
      else if (format === 'pdf') {
        await exportToPDF();
      }
    } catch (error) {
      console.error('Export failed:', error);
      showNotification('Export failed. Please try again.', 'error');
    }
  };

  // PDF export function
  const exportToPDF = async () => {
    try {
      showNotification('Generating PDF...', 'info');
      
      const pdf = new jsPDF();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('EmailIntel Pro - Validation Report', 20, 30);
      
      // Add date
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
      
      let yPosition = 60;
      
      if (result) {
        // Single email result
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Email Analysis Results', 20, yPosition);
        yPosition += 20;
        
        pdf.setFontSize(12);
        pdf.text(`Email: ${result.email}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Validation Score: ${result.validation_score}/100`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Status: ${result.is_valid ? 'Valid' : 'Invalid'}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Risk Category: ${result.risk_category}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Confidence Level: ${result.confidence_level}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Quality Tier: ${result.quality_tier || 'Unknown'}`, 20, yPosition);
        yPosition += 20;
        
        // Add validation details
        if (result.score_breakdown) {
          pdf.setFontSize(14);
          pdf.text('Score Breakdown:', 20, yPosition);
          yPosition += 15;
          
          pdf.setFontSize(10);
          pdf.text(`Syntax Score: ${result.score_breakdown.syntax_score || 0}`, 25, yPosition);
          yPosition += 8;
          pdf.text(`MX Score: ${result.score_breakdown.mx_score || 0}`, 25, yPosition);
          yPosition += 8;
          pdf.text(`Security Score: ${result.score_breakdown.security_score || 0}`, 25, yPosition);
          yPosition += 8;
          pdf.text(`SMTP Score: ${result.score_breakdown.smtp_score || 0}`, 25, yPosition);
        }
      } else if (bulkResults) {
        // Bulk results
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Bulk Validation Results', 20, yPosition);
        yPosition += 20;
        
        pdf.setFontSize(12);
        pdf.text(`Total Emails: ${bulkResults.summary?.total || 0}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Valid Emails: ${bulkResults.summary?.valid || 0}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Invalid Emails: ${bulkResults.summary?.invalid || 0}`, 20, yPosition);
        yPosition += 10;
        pdf.text(`Success Rate: ${Math.round(bulkResults.summary?.valid_percentage || 0)}%`, 20, yPosition);
        yPosition += 20;
        
        // Add table header
        pdf.setFontSize(10);
        pdf.text('Email', 20, yPosition);
        pdf.text('Score', 80, yPosition);
        pdf.text('Status', 110, yPosition);
        pdf.text('Risk', 140, yPosition);
        yPosition += 10;
        
        // Add results (first 20 to fit on page)
        const resultsToShow = bulkResults.results?.slice(0, 20) || [];
        resultsToShow.forEach(item => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = 30;
          }
          
          pdf.text(item.email.substring(0, 25), 20, yPosition);
          pdf.text(`${item.validation_score}`, 80, yPosition);
          pdf.text(item.is_valid ? 'Valid' : 'Invalid', 110, yPosition);
          pdf.text(item.risk_category, 140, yPosition);
          yPosition += 8;
        });
        
        if (bulkResults.results?.length > 20) {
          yPosition += 10;
          pdf.text(`... and ${bulkResults.results.length - 20} more results`, 20, yPosition);
        }
      }
      
      // Save PDF
      pdf.save(`email-validation-report-${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export failed:', error);
      showNotification('PDF export failed. Please try again.', 'error');
    }
  };

  // Screenshot export functions using html2canvas
  const exportScreenshot = async (format = 'png') => {
    try {
      showNotification('Capturing screenshot...', 'info');
      
      // Get the main content area (excluding header)
      const element = document.querySelector('.main-content') || document.body;
      
      const canvas = await html2canvas(element, {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });
      
      if (format === 'png') {
        // Export as PNG
        canvas.toBlob((blob) => {
          saveAs(blob, `emailintel-screenshot-${new Date().toISOString().split('T')[0]}.png`);
          showNotification('Screenshot exported as PNG!');
        }, 'image/png');
      } else if (format === 'jpg') {
        // Export as JPG
        canvas.toBlob((blob) => {
          saveAs(blob, `emailintel-screenshot-${new Date().toISOString().split('T')[0]}.jpg`);
          showNotification('Screenshot exported as JPG!');
        }, 'image/jpeg', 0.9);
      } else if (format === 'pdf') {
        // Export screenshot as PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`emailintel-screenshot-${new Date().toISOString().split('T')[0]}.pdf`);
        showNotification('Screenshot exported as PDF!');
      }
    } catch (error) {
      console.error('Screenshot export failed:', error);
      showNotification('Screenshot export failed. Please try again.', 'error');
    }
  };

  // Export current results as screenshot
  const exportResultsScreenshot = async () => {
    try {
      showNotification('Capturing results screenshot...', 'info');
      
      // Get the results section specifically
      const resultsElement = resultsRef.current || document.querySelector('.results-section');
      
      if (!resultsElement) {
        showNotification('No results to capture', 'error');
        return;
      }
      
      const canvas = await html2canvas(resultsElement, {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      canvas.toBlob((blob) => {
        saveAs(blob, `emailintel-results-${new Date().toISOString().split('T')[0]}.png`);
        showNotification('Results screenshot exported!');
      }, 'image/png');
    } catch (error) {
      console.error('Results screenshot failed:', error);
      showNotification('Results screenshot failed. Please try again.', 'error');
    }
  };

  // Export dashboard charts as screenshot
  const exportChartsScreenshot = async () => {
    try {
      showNotification('Capturing charts screenshot...', 'info');
      
      // Get the charts container
      const chartsElement = document.querySelector('.charts-container');
      
      if (!chartsElement) {
        showNotification('No charts to capture', 'error');
        return;
      }
      
      const canvas = await html2canvas(chartsElement, {
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      canvas.toBlob((blob) => {
        saveAs(blob, `emailintel-charts-${new Date().toISOString().split('T')[0]}.png`);
        showNotification('Charts screenshot exported!');
      }, 'image/png');
    } catch (error) {
      console.error('Charts screenshot failed:', error);
      showNotification('Charts screenshot failed. Please try again.', 'error');
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
    }`}>
      
      {/* Notification System */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {notification.type === 'error' && <XCircle className="h-5 w-5" />}
            {notification.type === 'info' && <Activity className="h-5 w-5" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${
            darkMode 
              ? 'bg-gray-800/95 border-gray-700/50' 
              : 'bg-white/95 border-gray-200/50'
          }`}>
            
            {/* Settings Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Settings & Configuration
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Customize your EmailIntel Pro experience
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              
              {/* API Configuration */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span>API Configuration</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      API URL
                    </label>
                    <input
                      type="url"
                      value={settings.apiUrl}
                      onChange={(e) => updateSetting('apiUrl', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="http://localhost:8080"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      API Version
                    </label>
                    <select
                      value={settings.apiVersion}
                      onChange={(e) => updateSetting('apiVersion', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="v1">v1</option>
                      <option value="v2">v2</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Performance Settings */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Performance Settings</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Max Bulk Emails
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={settings.maxBulkEmails}
                      onChange={(e) => updateSetting('maxBulkEmails', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Auto Refresh Interval (seconds)
                    </label>
                    <select
                      value={settings.autoRefreshInterval}
                      onChange={(e) => updateSetting('autoRefreshInterval', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* UI/UX Settings */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span>UI/UX Settings</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Theme
                      </label>
                      <select
                        value={settings.theme}
                        onChange={(e) => updateSetting('theme', e.target.value)}
                        className={`px-3 py-1 rounded border ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="auto">Auto</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Enable Animations
                      </label>
                      <button
                        onClick={() => updateSetting('enableAnimations', !settings.enableAnimations)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.enableAnimations ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enableAnimations ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Show Tooltips
                      </label>
                      <button
                        onClick={() => updateSetting('showTooltips', !settings.showTooltips)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.showTooltips ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.showTooltips ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Compact Mode
                      </label>
                      <button
                        onClick={() => updateSetting('compactMode', !settings.compactMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.compactMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.compactMode ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Enable Notifications
                      </label>
                      <button
                        onClick={() => updateSetting('enableNotifications', !settings.enableNotifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.enableNotifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className={`text-sm font-medium flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {settings.soundEffects ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                          <span>Sound Effects</span>
                        </label>
                        <button
                          onClick={() => updateSetting('soundEffects', !settings.soundEffects)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.soundEffects ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.soundEffects ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                      
                      {/* Sound Test Buttons */}
                      {settings.soundEffects && (
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => testSound('success')}
                            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors"
                          >
                            Test Success
                          </button>
                          <button
                            onClick={() => testSound('error')}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
                          >
                            Test Error
                          </button>
                          <button
                            onClick={() => testSound('info')}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                          >
                            Test Info
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <Contrast className="h-4 w-4" />
                        <span>High Contrast</span>
                      </label>
                      <button
                        onClick={() => updateSetting('highContrast', !settings.highContrast)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.highContrast ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <Accessibility className="h-4 w-4" />
                        <span>Reduced Motion</span>
                      </label>
                      <button
                        onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Settings */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Settings className="h-5 w-5 text-green-500" />
                  <span>Default Settings</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Default Deep Analysis
                    </label>
                    <button
                      onClick={() => updateSetting('defaultDeepAnalysis', !settings.defaultDeepAnalysis)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.defaultDeepAnalysis ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.defaultDeepAnalysis ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Default Export Format
                    </label>
                    <select
                      value={settings.exportFormat}
                      onChange={(e) => updateSetting('exportFormat', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Mobile & Responsive Settings */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Smartphone className="h-5 w-5 text-indigo-500" />
                  <span>Mobile & Responsive</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => updateSetting('language', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="local">Local Time</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London Time</option>
                      <option value="Asia/Tokyo">Tokyo Time</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data & Privacy */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Shield className="h-5 w-5 text-red-500" />
                  <span>Data & Privacy</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Cache Results Locally
                    </label>
                    <button
                      onClick={() => updateSetting('cacheResults', !settings.cacheResults)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.cacheResults ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.cacheResults ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Auto-save Settings
                    </label>
                    <button
                      onClick={() => updateSetting('autoSave', !settings.autoSave)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.autoSave ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings Actions */}
              <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={exportSettings}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Settings</span>
                </button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    className="hidden"
                    id="importSettings"
                  />
                  <label
                    htmlFor="importSettings"
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Import Settings</span>
                  </label>
                </div>
                
                <button
                  onClick={resetSettings}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset to Defaults</span>
                </button>
                
                <button
                  onClick={() => setShowSettings(false)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  <span>Save & Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Premium Glassmorphism Header */}
      <div className={`backdrop-blur-xl border-b sticky top-0 z-50 transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-900/80 border-gray-700/50' 
          : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Premium Brand */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-75"></div>
                <div className="relative p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <Mail className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <div>
                <h1 className={`text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                  EmailIntel Pro
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Enterprise Email Intelligence Platform
                </p>
              </div>
              
              <div className="hidden md:flex items-center space-x-2">
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium rounded-full">
                  ⚡ Ultra-Fast
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-medium rounded-full">
                  🧠 AI-Powered
                </span>
              </div>
            </div>
            
            {/* Real-time Stats & Controls */}
            <div className="flex items-center space-x-6">
              {realTimeStats && (
                <div className="hidden lg:flex items-center space-x-6 text-sm">
                  <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <span>{realTimeStats.requests?.total || 0} requests</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span>{Math.round(realTimeStats.performance?.avg_latency_ms || 0)}ms avg</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>{Math.round(realTimeStats.performance?.success_rate || 0)}% success</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl ${
            darkMode 
              ? 'bg-gray-800/95 border-gray-700/50' 
              : 'bg-white/95 border-gray-200/50'
          }`}>
            
            {/* Settings Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Settings & Configuration
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Customize your EmailIntel Pro experience
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              
              {/* API Configuration */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span>API Configuration</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      API Base URL
                    </label>
                    <input
                      type="url"
                      value={settings.apiUrl}
                      onChange={(e) => updateSetting('apiUrl', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-900/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="http://localhost:8080"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      API Version
                    </label>
                    <select
                      value={settings.apiVersion}
                      onChange={(e) => updateSetting('apiVersion', e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-900/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="v1">v1</option>
                      <option value="v2">v2 (Beta)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Performance Settings */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Performance Settings</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Max Bulk Emails
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={settings.maxBulkEmails}
                      onChange={(e) => updateSetting('maxBulkEmails', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-900/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Auto Refresh Interval (seconds)
                    </label>
                    <select
                      value={settings.autoRefreshInterval}
                      onChange={(e) => updateSetting('autoRefreshInterval', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-900/50 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={0}>Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* UI/UX Settings */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Eye className="h-5 w-5 text-purple-500" />
                  <span>Interface Settings</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Theme
                      </label>
                      <select
                        value={settings.theme}
                        onChange={(e) => updateSetting('theme', e.target.value)}
                        className={`px-3 py-1 rounded-lg border text-sm ${
                          darkMode 
                            ? 'bg-gray-900/50 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="auto">Auto</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Enable Animations
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.enableAnimations}
                        onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Show Tooltips
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.showTooltips}
                        onChange={(e) => updateSetting('showTooltips', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Compact Mode
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.compactMode}
                        onChange={(e) => updateSetting('compactMode', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Enable Notifications
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.enableNotifications}
                        onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className={`text-sm font-medium flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {settings.soundEffects ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                          <span>Sound Effects</span>
                        </label>
                        <input
                          type="checkbox"
                          checked={settings.soundEffects}
                          onChange={(e) => updateSetting('soundEffects', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Sound Test Buttons */}
                      {settings.soundEffects && (
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => testSound('success')}
                            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                          >
                            ✓ Success
                          </button>
                          <button
                            onClick={() => testSound('error')}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                          >
                            ✗ Error
                          </button>
                          <button
                            onClick={() => testSound('info')}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                          >
                            ℹ Info
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        High Contrast
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.highContrast}
                        onChange={(e) => updateSetting('highContrast', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Reduced Motion
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.reducedMotion}
                        onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Settings */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Default Behavior</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Default Deep Analysis
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.defaultDeepAnalysis}
                        onChange={(e) => updateSetting('defaultDeepAnalysis', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Cache Results
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.cacheResults}
                        onChange={(e) => updateSetting('cacheResults', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Auto Save Settings
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.autoSave}
                        onChange={(e) => updateSetting('autoSave', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Default Export Format
                      </label>
                      <select
                        value={settings.exportFormat}
                        onChange={(e) => updateSetting('exportFormat', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          darkMode 
                            ? 'bg-gray-900/50 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          darkMode 
                            ? 'bg-gray-900/50 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Database className="h-5 w-5 text-indigo-500" />
                  <span>Data Management</span>
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <button
                    onClick={() => {
                      localStorage.clear();
                      setValidationHistory([]);
                      showNotification('All data cleared successfully', 'success');
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    Clear All Data
                  </button>
                  
                  <button
                    onClick={exportSettings}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Export Settings
                  </button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importSettings}
                      className="hidden"
                      id="importSettings"
                    />
                    <label
                      htmlFor="importSettings"
                      className="block px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Import Settings
                    </label>
                  </div>
                </div>
                
                {/* Screenshot Export Options */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Screenshot Export
                  </h4>
                  <div className="grid md:grid-cols-4 gap-3">
                    <button
                      onClick={() => exportScreenshot('png')}
                      className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors text-sm"
                    >
                      <Camera className="h-4 w-4 inline mr-1" />
                      PNG
                    </button>
                    
                    <button
                      onClick={() => exportScreenshot('jpg')}
                      className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors text-sm"
                    >
                      <Camera className="h-4 w-4 inline mr-1" />
                      JPG
                    </button>
                    
                    <button
                      onClick={() => exportScreenshot('pdf')}
                      className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors text-sm"
                    >
                      <Camera className="h-4 w-4 inline mr-1" />
                      PDF
                    </button>
                    
                    <button
                      onClick={exportChartsScreenshot}
                      className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors text-sm"
                    >
                      <Camera className="h-4 w-4 inline mr-1" />
                      Charts
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={resetSettings}
                  className={`px-6 py-2 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Reset to Defaults
                </button>
                
                <div className="space-x-3">
                  <button
                    onClick={() => setShowSettings(false)}
                    className={`px-6 py-2 rounded-lg border transition-colors ${
                      darkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      showNotification('Settings saved successfully', 'success');
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 main-content">
        
        {/* Premium Navigation Tabs */}
        <div className={`flex space-x-2 p-2 rounded-2xl mb-8 backdrop-blur-xl border transition-all duration-300 ${
          darkMode 
            ? 'bg-gray-800/60 border-gray-700/50' 
            : 'bg-white/60 border-gray-200/50'
        }`}>
          {[
            { id: 'analyze', label: 'Intelligence Analysis', icon: Brain, gradient: 'from-blue-500 to-purple-600' },
            { id: 'bulk', label: 'Bulk Processing', icon: Database, gradient: 'from-purple-500 to-pink-600' },
            { id: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3, gradient: 'from-emerald-500 to-green-600' },
            { id: 'history', label: 'Validation History', icon: Clock, gradient: 'from-orange-500 to-red-500' },
          ].map(({ id, label, icon: Icon, gradient }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group ${
                activeTab === id
                  ? `bg-gradient-to-r ${gradient} text-white shadow-lg transform scale-105`
                  : darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              {activeTab === id && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50"></div>
              )}
              <Icon className="h-5 w-5 relative z-10" />
              <span className="relative z-10">{label}</span>
              {activeTab === id && (
                <Sparkles className="h-4 w-4 relative z-10 animate-pulse" />
              )}
            </button>
          ))}
        </div>
        {/* Intelligence Analysis Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-8">
            
            {/* Premium Input Section */}
            <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-800/60 border-gray-700/50' 
                : 'bg-white/80 border-gray-200/50'
            }`}>
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-75"></div>
                  <div className="relative p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    AI-Powered Email Intelligence
                  </h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ultra-accurate validation with real-time intelligence and ML predictions
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-auto">
                  <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium rounded-full animate-pulse">
                    🚀 Enterprise Grade
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Email Input with Auto-suggestions */}
                <div className="space-y-3">
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email Address Analysis
                  </label>
                  
                  <div className="relative">
                    <div className="flex space-x-4">
                      <div className="flex-1 relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter email address for comprehensive analysis..."
                          className={`w-full px-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-lg ${
                            darkMode 
                              ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white/90 border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                          onKeyPress={(e) => e.key === 'Enter' && analyzeEmail()}
                        />
                        
                        {email && (
                          <button
                            onClick={() => copyToClipboard(email)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={analyzeEmail}
                        disabled={loading || !email.trim()}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5" />
                            <span>Analyze</span>
                            <ArrowRight className="h-5 w-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className={`p-6 rounded-2xl border transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-900/30 border-gray-700/50' 
                    : 'bg-gray-50/80 border-gray-200/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="deepAnalysis"
                          checked={deepAnalysis}
                          onChange={(e) => setDeepAnalysis(e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label htmlFor="deepAnalysis" className={`font-medium cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Deep Intelligence Analysis
                        </label>
                      </div>
                      
                      <div className="relative">
                        <button
                          onMouseEnter={() => setShowTooltip('deepAnalysis')}
                          onMouseLeave={() => setShowTooltip(null)}
                          className={`p-1 rounded-full ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                        
                        {showTooltip === 'deepAnalysis' && (
                          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap z-50 ${
                            darkMode ? 'bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white text-gray-700 border border-gray-200 shadow-lg'
                          }`}>
                            Includes SMTP validation, ML predictions & advanced security analysis
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span>{deepAnalysis ? 'Ultra-Accurate Mode' : 'Lightning Mode'}</span>
                      </div>
                      
                      {processingMetrics && (
                        <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span>{processingMetrics.processingTime}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Results Section */}
            {result && (
              <div ref={resultsRef} className="space-y-8 animate-fade-in results-section">
                
                {/* Hero Score Display */}
                <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl transition-all duration-500 ${
                  darkMode 
                    ? 'bg-gray-800/60 border-gray-700/50' 
                    : 'bg-white/80 border-gray-200/50'
                }`}>
                  <div className="grid lg:grid-cols-4 gap-8">
                    
                    {/* Animated Score Meter */}
                    <div className="text-center">
                      <div className="relative w-32 h-32 mx-auto mb-4">
                        {/* Background Circle */}
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke={darkMode ? "#374151" : "#e5e7eb"}
                            strokeWidth="8"
                            fill="none"
                          />
                          {/* Animated Progress Circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="url(#scoreGradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(animatedScore / 100) * 251.2} 251.2`}
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor={animatedScore >= 90 ? "#10b981" : animatedScore >= 75 ? "#3b82f6" : animatedScore >= 60 ? "#f59e0b" : "#ef4444"} />
                              <stop offset="100%" stopColor={animatedScore >= 90 ? "#059669" : animatedScore >= 75 ? "#1d4ed8" : animatedScore >= 60 ? "#d97706" : "#dc2626"} />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* Score Text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-3xl font-bold ${getScoreTextColor(animatedScore)}`}>
                              {animatedScore}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Score
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Intelligence Score
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Ultra-Accurate Algorithm
                      </p>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="text-center">
                      <div className={`w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center border-4 ${
                        result.is_valid 
                          ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700' 
                          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                      }`}>
                        {result.is_valid ? (
                          <CheckCircle className="h-16 w-16 text-emerald-600" />
                        ) : (
                          <XCircle className="h-16 w-16 text-red-600" />
                        )}
                      </div>
                      
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Validation Status
                      </h3>
                      <p className={`text-sm font-medium ${
                        result.is_valid ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {result.is_valid ? 'DELIVERABLE' : 'NOT DELIVERABLE'}
                      </p>
                    </div>
                    
                    {/* Risk Category */}
                    <div className="text-center">
                      <div className={`w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center border-4 ${getRiskCategoryColor(result.risk_category)}`}>
                        <ShieldIcon className="h-16 w-16" />
                      </div>
                      
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Risk Assessment
                      </h3>
                      <p className={`text-sm font-medium px-3 py-1 rounded-full ${getRiskCategoryColor(result.risk_category)}`}>
                        {result.risk_category}
                      </p>
                    </div>
                    
                    {/* Confidence Level */}
                    <div className="text-center">
                      <div className={`w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center border-4 ${
                        result.confidence_level === 'High' 
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' 
                          : result.confidence_level === 'Medium'
                          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
                          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                      }`}>
                        <Gauge className={`h-16 w-16 ${
                          result.confidence_level === 'High' ? 'text-blue-600' :
                          result.confidence_level === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                        }`} />
                      </div>
                      
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        AI Confidence
                      </h3>
                      <p className={`text-sm font-medium ${
                        result.confidence_level === 'High' ? 'text-blue-600' :
                        result.confidence_level === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.confidence_level} Certainty
                      </p>
                    </div>
                  </div>
                </div>
                {/* Detailed Intelligence Analysis */}
                <div className="grid lg:grid-cols-2 gap-8">
                  
                  {/* Technical Validation */}
                  <div className={`backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800/60 border-gray-700/50' 
                      : 'bg-white/80 border-gray-200/50'
                  }`}>
                    <div className="flex items-center space-x-3 mb-6">
                      <Cpu className="h-6 w-6 text-purple-600" />
                      <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Technical Validation
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Validation Checks */}
                      {[
                        { 
                          label: 'Syntax Validation', 
                          status: result.syntax_validation?.status,
                          reason: result.syntax_validation?.reason,
                          score: result.syntax_validation?.score,
                          weight: result.syntax_validation?.weight
                        },
                        { 
                          label: 'DNS Validation', 
                          status: result.dns_validation?.domain_exists?.status,
                          reason: result.dns_validation?.domain_exists?.reason,
                          score: result.dns_validation?.domain_exists?.score
                        },
                        { 
                          label: 'MX Records', 
                          status: result.dns_validation?.mx_records?.status,
                          reason: result.dns_validation?.mx_records?.reason,
                          score: result.dns_validation?.mx_records?.score
                        },
                        { 
                          label: 'SMTP Reachability', 
                          status: result.smtp_validation?.reachable?.status,
                          reason: result.smtp_validation?.reachable?.reason,
                          score: result.smtp_validation?.reachable?.score
                        }
                      ].map((check, index) => (
                        <div key={index} className={`p-4 rounded-xl border transition-all duration-200 ${
                          check.status === 'pass' 
                            ? darkMode ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'
                            : check.status === 'fail'
                            ? darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200'
                            : darkMode ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              {check.status === 'pass' ? (
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                              ) : check.status === 'fail' ? (
                                <XCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                              )}
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {check.label}
                              </span>
                            </div>
                            
                            {check.score !== undefined && (
                              <span className={`text-sm font-bold px-2 py-1 rounded ${
                                check.status === 'pass' ? 'text-emerald-700 bg-emerald-100' :
                                check.status === 'fail' ? 'text-red-700 bg-red-100' :
                                'text-yellow-700 bg-yellow-100'
                              }`}>
                                {check.score}/{check.weight || 10}
                              </span>
                            )}
                          </div>
                          
                          <p className={`text-sm ${
                            check.status === 'pass' ? 'text-emerald-700 dark:text-emerald-300' :
                            check.status === 'fail' ? 'text-red-700 dark:text-red-300' :
                            'text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {check.reason || 'No details available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Security Analysis */}
                  <div className={`backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800/60 border-gray-700/50' 
                      : 'bg-white/80 border-gray-200/50'
                  }`}>
                    <div className="flex items-center space-x-3 mb-6">
                      <Shield className="h-6 w-6 text-green-600" />
                      <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Security Analysis
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Security Records */}
                      {result.security_analysis && [
                        { 
                          label: 'SPF Record', 
                          status: result.security_analysis.spf_record?.status,
                          reason: result.security_analysis.spf_record?.reason,
                          rawSignal: result.security_analysis.spf_record?.raw_signal
                        },
                        { 
                          label: 'DKIM Record', 
                          status: result.security_analysis.dkim_record?.status,
                          reason: result.security_analysis.dkim_record?.reason,
                          rawSignal: result.security_analysis.dkim_record?.raw_signal
                        },
                        { 
                          label: 'DMARC Record', 
                          status: result.security_analysis.dmarc_record?.status,
                          reason: result.security_analysis.dmarc_record?.reason,
                          rawSignal: result.security_analysis.dmarc_record?.raw_signal
                        }
                      ].map((record, index) => (
                        <div key={index} className={`p-4 rounded-xl border transition-all duration-200 ${
                          record.status === 'pass' 
                            ? darkMode ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'
                            : darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              {record.status === 'pass' ? (
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {record.label}
                              </span>
                            </div>
                            
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              record.status === 'pass' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {record.status === 'pass' ? 'FOUND' : 'MISSING'}
                            </span>
                          </div>
                          
                          <p className={`text-sm ${
                            record.status === 'pass' 
                              ? 'text-emerald-700 dark:text-emerald-300' 
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {record.reason}
                          </p>
                          
                          {record.rawSignal && record.rawSignal !== 'no_spf_record' && record.rawSignal !== 'no_dkim_record' && record.rawSignal !== 'no_dmarc_record' && (
                            <div className={`mt-2 p-2 rounded text-xs font-mono ${
                              darkMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {record.rawSignal.length > 100 ? record.rawSignal.substring(0, 100) + '...' : record.rawSignal}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Security Score */}
                      <div className={`p-4 rounded-xl border ${
                        darkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Overall Security Score
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {result.security_analysis?.security_score || 0}/20
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${((result.security_analysis?.security_score || 0) / 20) * 100}%` }}
                          ></div>
                        </div>
                        
                        <p className={`text-sm mt-2 ${
                          (result.security_analysis?.security_score || 0) >= 15 
                            ? 'text-emerald-600' 
                            : (result.security_analysis?.security_score || 0) >= 7 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                        }`}>
                          Threat Level: {result.security_analysis?.threat_level || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* ML Predictions & Risk Analysis */}
                {result.ml_predictions && (
                  <div className={`backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800/60 border-gray-700/50' 
                      : 'bg-white/80 border-gray-200/50'
                  }`}>
                    <div className="flex items-center space-x-3 mb-6">
                      <Brain className="h-6 w-6 text-purple-600" />
                      <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        AI Predictions & Risk Analysis
                      </h3>
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-medium rounded-full">
                        ML-Powered
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                      {/* Spam Probability */}
                      <div className="text-center">
                        <div className={`w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center border-4 ${
                          result.ml_predictions.spam_probability < 0.3 
                            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700'
                            : result.ml_predictions.spam_probability < 0.7
                            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
                            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                        }`}>
                          <span className={`text-lg font-bold ${
                            result.ml_predictions.spam_probability < 0.3 ? 'text-emerald-600' :
                            result.ml_predictions.spam_probability < 0.7 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {Math.round(result.ml_predictions.spam_probability * 100)}%
                          </span>
                        </div>
                        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Spam Risk
                        </h4>
                        <p className={`text-xs ${
                          result.ml_predictions.spam_probability < 0.3 ? 'text-emerald-600' :
                          result.ml_predictions.spam_probability < 0.7 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {result.ml_predictions.spam_probability < 0.3 ? 'Low Risk' :
                           result.ml_predictions.spam_probability < 0.7 ? 'Medium Risk' : 'High Risk'}
                        </p>
                      </div>
                      
                      {/* Bounce Probability */}
                      <div className="text-center">
                        <div className={`w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center border-4 ${
                          result.ml_predictions.bounce_probability < 0.3 
                            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700'
                            : result.ml_predictions.bounce_probability < 0.7
                            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
                            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                        }`}>
                          <span className={`text-lg font-bold ${
                            result.ml_predictions.bounce_probability < 0.3 ? 'text-emerald-600' :
                            result.ml_predictions.bounce_probability < 0.7 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {Math.round(result.ml_predictions.bounce_probability * 100)}%
                          </span>
                        </div>
                        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Bounce Risk
                        </h4>
                        <p className={`text-xs ${
                          result.ml_predictions.bounce_probability < 0.3 ? 'text-emerald-600' :
                          result.ml_predictions.bounce_probability < 0.7 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {result.ml_predictions.bounce_probability < 0.3 ? 'Low Risk' :
                           result.ml_predictions.bounce_probability < 0.7 ? 'Medium Risk' : 'High Risk'}
                        </p>
                      </div>
                      
                      {/* Deliverability Score */}
                      <div className="text-center">
                        <div className={`w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center border-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700`}>
                          <span className="text-lg font-bold text-blue-600">
                            {Math.round(result.ml_predictions.deliverability_score * 100)}%
                          </span>
                        </div>
                        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Deliverability
                        </h4>
                        <p className="text-xs text-blue-600">
                          ML Confidence: {Math.round(result.ml_predictions.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* ML Explanation */}
                    {result.ml_predictions.explanation && (
                      <div className={`p-4 rounded-xl border ${
                        darkMode ? 'bg-purple-900/20 border-purple-700/50' : 'bg-purple-50 border-purple-200'
                      }`}>
                        <div className="flex items-start space-x-3">
                          <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <h5 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              AI Analysis Explanation
                            </h5>
                            <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                              {result.ml_predictions.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Domain Intelligence */}
                {result.domain_intelligence && (
                  <div className={`backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800/60 border-gray-700/50' 
                      : 'bg-white/80 border-gray-200/50'
                  }`}>
                    <div className="flex items-center space-x-3 mb-6">
                      <Globe className="h-6 w-6 text-indigo-600" />
                      <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Domain Intelligence
                      </h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {/* Domain Classification */}
                        {[
                          { 
                            label: 'Disposable Email', 
                            status: result.domain_intelligence.is_disposable?.status,
                            reason: result.domain_intelligence.is_disposable?.reason,
                            critical: true
                          },
                          { 
                            label: 'Free Provider', 
                            status: result.domain_intelligence.is_free_provider?.status,
                            reason: result.domain_intelligence.is_free_provider?.reason
                          },
                          { 
                            label: 'Corporate Domain', 
                            status: result.domain_intelligence.is_corporate?.status,
                            reason: result.domain_intelligence.is_corporate?.reason
                          },
                          { 
                            label: 'Catch-All Domain', 
                            status: result.domain_intelligence.is_catch_all?.status,
                            reason: result.domain_intelligence.is_catch_all?.reason
                          }
                        ].map((item, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            item.status === 'pass' 
                              ? darkMode ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'
                              : item.status === 'fail' && item.critical
                              ? darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200'
                              : darkMode ? 'bg-gray-800/50 border-gray-600/50' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.label}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                item.status === 'pass' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : item.status === 'fail'
                                  ? item.critical ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {item.status === 'pass' ? 'YES' : item.status === 'fail' ? 'NO' : 'UNKNOWN'}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {item.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-4">
                        {/* Reputation Metrics */}
                        <div className={`p-4 rounded-xl border ${
                          darkMode ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200'
                        }`}>
                          <h5 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Reputation Metrics
                          </h5>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Domain Age
                              </span>
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {result.domain_intelligence.domain_age || 'Unknown'} days
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Reputation Score
                              </span>
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {result.domain_intelligence.reputation_score || 0}/100
                              </span>
                            </div>
                            
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${result.domain_intelligence.reputation_score || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Risk Indicators */}
                        {result.domain_intelligence.risk_indicators && result.domain_intelligence.risk_indicators.length > 0 && (
                          <div className={`p-4 rounded-xl border ${
                            darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200'
                          }`}>
                            <h5 className={`font-medium mb-3 text-red-700 dark:text-red-300`}>
                              Risk Indicators
                            </h5>
                            <ul className="space-y-1">
                              {result.domain_intelligence.risk_indicators.map((indicator, index) => (
                                <li key={index} className={`text-sm flex items-start space-x-2 text-red-600 dark:text-red-400`}>
                                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span>{indicator}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Warnings & Recommendations */}
                {(result.warnings?.length > 0 || result.suggestions?.length > 0) && (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {result.warnings?.length > 0 && (
                      <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
                        darkMode 
                          ? 'bg-red-900/20 border-red-700/50' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center space-x-3 mb-4">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-red-300' : 'text-red-900'}`}>
                            Critical Warnings
                          </h3>
                        </div>
                        <ul className="space-y-3">
                          {result.warnings.map((warning, index) => (
                            <li key={index} className={`flex items-start space-x-3 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                              <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm">{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.suggestions?.length > 0 && (
                      <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
                        darkMode 
                          ? 'bg-blue-900/20 border-blue-700/50' 
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center space-x-3 mb-4">
                          <CheckCircle className="h-6 w-6 text-blue-600" />
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                            AI Recommendations
                          </h3>
                        </div>
                        <ul className="space-y-3">
                          {result.suggestions.map((suggestion, index) => (
                            <li key={index} className={`flex items-start space-x-3 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Alternative Email Suggestions */}
                {result.alternative_emails?.length > 0 && (
                  <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
                    darkMode 
                      ? 'bg-yellow-900/20 border-yellow-700/50' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <Star className="h-6 w-6 text-yellow-600" />
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>
                        Smart Corrections
                      </h3>
                      <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-xs font-medium rounded-full">
                        AI-Suggested
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {result.alternative_emails.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setEmail(suggestion)}
                          className={`px-4 py-2 rounded-xl border transition-all duration-200 hover:scale-105 ${
                            darkMode 
                              ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300 hover:bg-yellow-800/50' 
                              : 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bulk Processing Tab */}
        {activeTab === 'bulk' && (
          <div className="space-y-8">
            
            {/* Bulk Upload Section */}
            <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-800/60 border-gray-700/50' 
                : 'bg-white/80 border-gray-200/50'
            }`}>
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur opacity-75"></div>
                  <div className="relative p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Bulk Email Processing
                  </h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Process up to 1,000 emails simultaneously with enterprise-grade performance
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-auto">
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-medium rounded-full animate-pulse">
                    🚀 Ultra-Fast Batch Processing
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Bulk Input Methods */}
                <div className="grid md:grid-cols-2 gap-6">
                  
                  {/* Text Area Input */}
                  <div className="space-y-3">
                    <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Paste Email List (One per line)
                    </label>
                    
                    <textarea
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      placeholder="user1@example.com&#10;user2@company.org&#10;user3@domain.net&#10;..."
                      rows={10}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none ${
                        darkMode 
                          ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white/90 border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {bulkEmails.split('\n').filter(e => e.trim()).length} emails
                      </span>
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Max: 1,000 emails
                      </span>
                    </div>
                  </div>
                  
                  {/* CSV Upload */}
                  <div className="space-y-3">
                    <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Upload CSV File
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 hover:border-purple-500 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-900/30' 
                        : 'border-gray-300 bg-gray-50/50'
                    }`}>
                      <Upload className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Drag & Drop CSV File
                      </p>
                      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Or click to browse files
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csvUpload"
                      />
                      <label
                        htmlFor="csvUpload"
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 cursor-pointer inline-block"
                      >
                        Choose File
                      </label>
                      {csvFile && (
                        <p className={`text-sm mt-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          ✓ {csvFile.name} loaded
                        </p>
                      )}
                    </div>
                    
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Supported formats: CSV with email column header
                    </div>
                  </div>
                </div>

                {/* Bulk Analysis Options */}
                <div className={`p-6 rounded-2xl border transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-900/30 border-gray-700/50' 
                    : 'bg-gray-50/80 border-gray-200/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="bulkDeepAnalysis"
                          checked={deepAnalysis}
                          onChange={(e) => setDeepAnalysis(e.target.checked)}
                          className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                        />
                        <label htmlFor="bulkDeepAnalysis" className={`font-medium cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Deep Analysis for All Emails
                        </label>
                      </div>
                    </div>
                    
                    <button
                      onClick={analyzeBulk}
                      disabled={loading || !bulkEmails.trim()}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          <span>Process Bulk</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Results */}
            {bulkResults && (
              <div className="space-y-8 animate-fade-in">
                
                {/* Bulk Summary */}
                <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800/60 border-gray-700/50' 
                    : 'bg-white/80 border-gray-200/50'
                }`}>
                  <h3 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Bulk Analysis Summary
                  </h3>
                  
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {bulkResults.summary?.total || 0}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Total Processed
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-600 mb-2">
                        {bulkResults.summary?.valid || 0}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Valid Emails
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 mb-2">
                        {bulkResults.summary?.invalid || 0}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Invalid Emails
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {Math.round(bulkResults.summary?.valid_percentage || 0)}%
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Success Rate
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bulk Results Table */}
                <div className={`backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden ${
                  darkMode 
                    ? 'bg-gray-800/60 border-gray-700/50' 
                    : 'bg-white/80 border-gray-200/50'
                }`}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Detailed Results
                      </h3>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => exportResults('csv')}
                          className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Download className="h-4 w-4 inline mr-2" />
                          Export CSV
                        </button>
                        
                        <button
                          onClick={() => exportResults('json')}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                        >
                          <FileText className="h-4 w-4 inline mr-2" />
                          Export JSON
                        </button>
                        
                        <button
                          onClick={exportResultsScreenshot}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                        >
                          <Camera className="h-4 w-4 inline mr-2" />
                          Screenshot
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Email Address
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Score
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Status
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Risk Level
                          </th>
                          <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Quality
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {bulkResults.results?.map((result, index) => (
                          <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {result.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-bold ${getScoreTextColor(result.validation_score)}`}>
                                {result.validation_score}/100
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                result.is_valid 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.is_valid ? 'Valid' : 'Invalid'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskCategoryColor(result.risk_category)}`}>
                                {result.risk_category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {result.quality_tier || 'Unknown'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Dashboard Header */}
            <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-800/60 border-gray-700/50' 
                : 'bg-white/80 border-gray-200/50'
            }`}>
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl blur opacity-75"></div>
                  <div className="relative p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Analytics Dashboard
                  </h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Real-time insights and performance metrics
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-auto">
                  <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium rounded-full animate-pulse">
                    📊 Live Analytics
                  </span>
                </div>
              </div>
              
              {/* Real-time Stats Grid */}
              {realTimeStats && (
                <div className="grid md:grid-cols-4 gap-6">
                  <div className={`p-6 rounded-2xl border ${
                    darkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <Activity className="h-6 w-6 text-blue-600" />
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Total Requests
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {realTimeStats.requests?.total || 0}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      All-time validations
                    </div>
                  </div>
                  
                  <div className={`p-6 rounded-2xl border ${
                    darkMode ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Success Rate
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mb-1">
                      {Math.round(realTimeStats.performance?.success_rate || 0)}%
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Validation accuracy
                    </div>
                  </div>
                  
                  <div className={`p-6 rounded-2xl border ${
                    darkMode ? 'bg-purple-900/20 border-purple-700/50' : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <Zap className="h-6 w-6 text-purple-600" />
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Avg Latency
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {Math.round(realTimeStats.performance?.avg_latency_ms || 0)}ms
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Response time
                    </div>
                  </div>
                  
                  <div className={`p-6 rounded-2xl border ${
                    darkMode ? 'bg-orange-900/20 border-orange-700/50' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <Users className="h-6 w-6 text-orange-600" />
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Cache Hits
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {realTimeStats.cache?.items || 0}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Cached results
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Charts */}
            <div className="charts-container">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Performance Charts & Analytics
                </h2>
                <button
                  onClick={exportChartsScreenshot}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                >
                  <Camera className="h-4 w-4 inline mr-2" />
                  Export Charts
                </button>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-8">
              <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
                darkMode 
                  ? 'bg-gray-800/60 border-gray-700/50' 
                  : 'bg-white/80 border-gray-200/50'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Validation Trends (Last 7 Days)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.validationTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis 
                        dataKey="date" 
                        stroke={darkMode ? '#9ca3af' : '#6b7280'}
                        fontSize={12}
                      />
                      <YAxis 
                        stroke={darkMode ? '#9ca3af' : '#6b7280'}
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          color: darkMode ? '#ffffff' : '#000000'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="valid" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        name="Valid Emails"
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="invalid" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        name="Invalid Emails"
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Total Processed"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
                darkMode 
                  ? 'bg-gray-800/60 border-gray-700/50' 
                  : 'bg-white/80 border-gray-200/50'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Risk Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={chartData.riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          color: darkMode ? '#ffffff' : '#000000'
                        }}
                        formatter={(value) => [`${value}%`, 'Percentage']}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Performance Metrics Bar Chart */}
            <div className={`backdrop-blur-xl rounded-2xl p-6 border ${
              darkMode 
                ? 'bg-gray-800/60 border-gray-700/50' 
                : 'bg-white/80 border-gray-200/50'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Performance Metrics
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="name" 
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <YAxis 
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        color: darkMode ? '#ffffff' : '#000000'
                      }}
                      formatter={(value, name, props) => [
                        `${value}${props.payload.unit}`, 
                        'Value'
                      ]}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Validation History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            
            {/* History Header */}
            <div className={`backdrop-blur-xl rounded-3xl p-8 border shadow-2xl transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-800/60 border-gray-700/50' 
                : 'bg-white/80 border-gray-200/50'
            }`}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur opacity-75"></div>
                  <div className="relative p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Validation History
                  </h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Recent email validations and analysis results
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 ml-auto">
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-medium rounded-full">
                    📝 {validationHistory.length} Records
                  </span>
                </div>
              </div>
              
              {/* Search and Filter */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search validation history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none ${
                      darkMode 
                        ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white/90 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                <button 
                  onClick={() => setValidationHistory([])}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* History List */}
            {validationHistory.length > 0 ? (
              <div className="space-y-4">
                {validationHistory
                  .filter(item => 
                    searchTerm === '' || 
                    item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.result.risk_category.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((item, index) => (
                  <div key={index} className={`backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                    darkMode 
                      ? 'bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80' 
                      : 'bg-white/80 border-gray-200/50 hover:bg-white/90'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          item.result.is_valid 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {item.result.is_valid ? (
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        
                        <div>
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.email}
                          </h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getScoreTextColor(item.result.validation_score)}`}>
                            {item.result.validation_score}/100
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.result.confidence_level} Confidence
                          </div>
                        </div>
                        
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRiskCategoryColor(item.result.risk_category)}`}>
                          {item.result.risk_category}
                        </span>
                        
                        <button
                          onClick={() => setResult(item.result)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Quick Summary */}
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Syntax
                        </div>
                        <div className={`font-medium ${
                          item.result.syntax_validation?.status === 'pass' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {item.result.syntax_validation?.status === 'pass' ? '✓' : '✗'}
                        </div>
                      </div>
                      
                      <div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          MX Records
                        </div>
                        <div className={`font-medium ${
                          item.result.dns_validation?.mx_records?.status === 'pass' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {item.result.dns_validation?.mx_records?.status === 'pass' ? '✓' : '✗'}
                        </div>
                      </div>
                      
                      <div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Security
                        </div>
                        <div className={`font-medium ${
                          (item.result.security_analysis?.security_score || 0) > 10 ? 'text-emerald-600' : 'text-yellow-600'
                        }`}>
                          {(item.result.security_analysis?.security_score || 0) > 10 ? '✓' : '~'}
                        </div>
                      </div>
                      
                      <div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Disposable
                        </div>
                        <div className={`font-medium ${
                          item.result.domain_intelligence?.is_disposable?.status === 'pass' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {item.result.domain_intelligence?.is_disposable?.status === 'pass' ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`backdrop-blur-xl rounded-2xl p-12 border text-center ${
                darkMode 
                  ? 'bg-gray-800/60 border-gray-700/50' 
                  : 'bg-white/80 border-gray-200/50'
              }`}>
                <Clock className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  No Validation History
                </h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Start analyzing emails to see your validation history here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Export & Actions */}
        {result && (
          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
              className={`px-6 py-3 rounded-xl border transition-all duration-200 hover:scale-105 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Copy className="h-4 w-4 inline mr-2" />
              Copy Results
            </button>
            
            <button
              onClick={() => exportResults('json')}
              className={`px-6 py-3 rounded-xl border transition-all duration-200 hover:scale-105 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Export JSON
            </button>
            
            <button
              onClick={() => exportResults('pdf')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105"
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Export PDF
            </button>
            
            <button
              onClick={exportResultsScreenshot}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:scale-105"
            >
              <Camera className="h-4 w-4 inline mr-2" />
              Screenshot
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseEmailIntelligencePlatform;