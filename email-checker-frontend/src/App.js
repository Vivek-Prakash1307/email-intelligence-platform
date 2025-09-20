import React, { useState, useEffect } from 'react';
import { 
  Mail, Search, Shield, Zap, TrendingUp, AlertTriangle, CheckCircle, 
  XCircle, Eye, EyeOff, BarChart3, Globe, Clock, Award, Target, 
  Cpu, Database, Lock, Unlock, Users, Building, Star, Activity,
  FileText, Download, Upload, Settings, HelpCircle, RefreshCw
} from 'lucide-react';

const EmailIntelligencePlatform = () => {
  const [activeTab, setActiveTab] = useState('analyze');
  const [email, setEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // 🚀 FIXED: Environment-based API URL configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
  
  // Helper function to build API URLs
  const getApiUrl = (endpoint) => `${API_BASE_URL}/api/${API_VERSION}/${endpoint}`;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(getApiUrl('stats'));
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const analyzeEmail = async () => {
    if (!email.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('analyze-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          deep_analysis: deepAnalysis 
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        email,
        is_valid: false,
        validation_score: 0,
        warnings: ['Network error - please try again'],
        suggestions: ['Unable to connect to validation service'],
      });
    }
    setLoading(false);
  };

  const analyzeBulk = async () => {
    if (!bulkEmails.trim()) return;
    
    const emails = bulkEmails.split('\n').filter(e => e.trim()).map(e => e.trim());
    if (emails.length === 0) return;
    
    // 🚀 FIXED: Use environment variable for max emails limit
    const maxEmails = parseInt(process.env.REACT_APP_MAX_BULK_EMAILS || '500');
    if (emails.length > maxEmails) {
      alert(`Maximum ${maxEmails} emails allowed per request`);
      return;
    }
    
    setLoading(true);
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
        summary: { total: 0, valid: 0, invalid: 0 },
        error: 'Network error - please try again'
      });
    }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBorderColor = (score) => {
    if (score >= 85) return 'border-green-200';
    if (score >= 70) return 'border-blue-200';
    if (score >= 50) return 'border-yellow-200';
    return 'border-red-200';
  };

  const getTierColor = (tier) => {
    const colors = {
      'Premium': 'text-purple-600 bg-purple-50 border-purple-200',
      'Good': 'text-green-600 bg-green-50 border-green-200',
      'Fair': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'Poor': 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[tier] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {process.env.REACT_APP_APP_NAME || 'Email Intelligence Platform'}
                </h1>
                <p className="text-sm text-gray-600">Advanced Email Analysis & Validation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {stats && (
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Activity className="h-4 w-4" />
                    <span>{stats.daily_requests} requests today</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>{stats.success_rate}% success rate</span>
                  </div>
                </div>
              )}
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 mb-8 border border-gray-200">
          {[
            { id: 'analyze', label: 'Single Analysis', icon: Search },
            { id: 'bulk', label: 'Bulk Analysis', icon: Database },
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Single Email Analysis Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Email Intelligence Analysis</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address to Analyze
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address (e.g., user@example.com)"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      onKeyPress={(e) => e.key === 'Enter' && analyzeEmail()}
                    />
                    <button
                      onClick={analyzeEmail}
                      disabled={loading || !email.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-2"
                    >
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deepAnalysis}
                      onChange={(e) => setDeepAnalysis(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable Deep Analysis</span>
                  </label>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <HelpCircle className="h-3 w-3" />
                    <span>Includes SMTP validation & security checks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {result && (
              <div className="space-y-6">
                {/* Overall Score Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${getScoreColor(result.validation_score)} ${getScoreBorderColor(result.validation_score)}`}>
                        {result.validation_score}
                      </div>
                      <h3 className="text-lg font-semibold mt-3 text-gray-900">Validation Score</h3>
                      <p className="text-sm text-gray-600">Overall quality rating</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center border-4 ${getTierColor(result.quality_tier)}`}>
                        {result.is_valid ? <CheckCircle className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                      </div>
                      <h3 className="text-lg font-semibold mt-3 text-gray-900">Status</h3>
                      <p className={`text-sm font-medium ${result.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                        {result.is_valid ? 'VALID' : 'INVALID'}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center text-sm font-bold border-4 ${getTierColor(result.quality_tier)}`}>
                        {result.quality_tier}
                      </div>
                      <h3 className="text-lg font-semibold mt-3 text-gray-900">Quality Tier</h3>
                      <p className="text-sm text-gray-600">Email classification</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Analysis Cards */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Technical Details */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <Cpu className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-semibold">Technical Analysis</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Syntax Valid</span>
                            {result.syntax_valid ? 
                              <CheckCircle className="h-4 w-4 text-green-600" /> : 
                              <XCircle className="h-4 w-4 text-red-600" />
                            }
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">MX Record</span>
                            {result.has_mx_record ? 
                              <CheckCircle className="h-4 w-4 text-green-600" /> : 
                              <XCircle className="h-4 w-4 text-red-600" />
                            }
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">SMTP Valid</span>
                            {result.smtp_valid ? 
                              <CheckCircle className="h-4 w-4 text-green-600" /> : 
                              <XCircle className="h-4 w-4 text-red-600" />
                            }
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Disposable</span>
                            {result.is_disposable ? 
                              <XCircle className="h-4 w-4 text-red-600" /> : 
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            }
                          </div>
                        </div>
                      </div>

                      {result.technical_details && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600 space-y-2">
                            <div className="flex justify-between">
                              <span>Response Time:</span>
                              <span className="font-medium">{result.technical_details.response_time_ms}ms</span>
                            </div>
                            {result.technical_details.ip_addresses && result.technical_details.ip_addresses.length > 0 && (
                              <div className="flex justify-between">
                                <span>IP Addresses:</span>
                                <span className="font-medium">{result.technical_details.ip_addresses.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security & Reputation */}
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <Shield className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold">Security & Reputation</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Security Score */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Security Score</span>
                          <span className={`text-lg font-bold ${getScoreColor(result.security_score || 50)}`}>
                            {result.security_score || 50}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${result.security_score >= 70 ? 'bg-green-500' : result.security_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${result.security_score || 50}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-lg p-3 text-center ${result.is_free_provider ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                          <Users className="h-4 w-4 mx-auto mb-1" />
                          <div className="text-xs font-medium">Free Provider</div>
                        </div>
                        
                        <div className={`rounded-lg p-3 text-center ${result.is_business_domain ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'}`}>
                          <Building className="h-4 w-4 mx-auto mb-1" />
                          <div className="text-xs font-medium">Business</div>
                        </div>
                      </div>

                      {/* Domain Reputation */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Domain Reputation</span>
                          <span className={`text-sm font-medium px-2 py-1 rounded ${
                            result.domain_reputation === 'excellent' ? 'bg-green-100 text-green-700' :
                            result.domain_reputation === 'good' ? 'bg-blue-100 text-blue-700' :
                            result.domain_reputation === 'poor' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {result.domain_reputation || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deliverability Scores */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <Target className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-semibold">Deliverability Analysis</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      { label: 'Deliverability Score', score: result.deliverability_score || 75, color: 'blue' },
                      { label: 'Security Score', score: result.security_score || 60, color: 'green' },
                      { label: 'Risk Assessment', score: 100 - (result.risk_factors ? result.risk_factors.length * 20 : 0), color: 'purple' }
                    ].map(({ label, score, color }) => (
                      <div key={label} className="text-center">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${
                          color === 'blue' ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' :
                          color === 'green' ? 'bg-green-50 text-green-600 border-2 border-green-200' :
                          'bg-purple-50 text-purple-600 border-2 border-purple-200'
                        }`}>
                          {score}
                        </div>
                        <h4 className="font-medium mt-2 text-gray-900">{label}</h4>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className={`h-1.5 rounded-full ${
                              color === 'blue' ? 'bg-blue-500' :
                              color === 'green' ? 'bg-green-500' :
                              'bg-purple-500'
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings and Suggestions */}
                {(result.warnings?.length > 0 || result.suggestions?.length > 0) && (
                  <div className="grid lg:grid-cols-2 gap-6">
                    {result.warnings?.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <h3 className="font-semibold text-red-900">Warnings</h3>
                        </div>
                        <ul className="space-y-2">
                          {result.warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-red-800 flex items-start space-x-2">
                              <span className="w-1 h-1 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.suggestions?.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-blue-900">Suggestions</h3>
                        </div>
                        <ul className="space-y-2">
                          {result.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                              <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Alternative Suggestions */}
                {result.alternative_suggestions?.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Star className="h-5 w-5 text-yellow-600" />
                      <h3 className="font-semibold text-yellow-900">Did you mean?</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.alternative_suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setEmail(suggestion)}
                          className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-sm transition-colors"
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

        {/* Bulk Analysis Tab */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Bulk Email Analysis</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Addresses (One per line, max {process.env.REACT_APP_MAX_BULK_EMAILS || '500'})
                  </label>
                  <textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com&#10;...&#10;(Up to 500 emails supported)"
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none font-mono text-sm"
                  />
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-gray-500">
                      {bulkEmails.split('\n').filter(e => e.trim()).length} emails entered
                    </span>
                    <span className={`font-medium ${
                      bulkEmails.split('\n').filter(e => e.trim()).length > parseInt(process.env.REACT_APP_MAX_BULK_EMAILS || '500')
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      Limit: {bulkEmails.split('\n').filter(e => e.trim()).length}/{process.env.REACT_APP_MAX_BULK_EMAILS || '500'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deepAnalysis}
                        onChange={(e) => setDeepAnalysis(e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Enable Deep Analysis</span>
                    </label>
                    <div className="text-xs text-gray-500 ml-6">
                      {deepAnalysis ? 
                        '⚡ Includes SMTP validation (slower but more accurate)' : 
                        '🚀 Fast validation (syntax, MX, disposable detection)'
                      }
                    </div>
                  </div>
                  
                  <button
                    onClick={analyzeBulk}
                    disabled={loading || !bulkEmails.trim() || bulkEmails.split('\n').filter(e => e.trim()).length > parseInt(process.env.REACT_APP_MAX_BULK_EMAILS || '500')}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-2"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span>{loading ? 'Processing...' : 'Analyze Bulk'}</span>
                  </button>
                </div>

                {/* Processing Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>Processing Tips for Large Batches</span>
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Recommended batch size:</strong> 250 emails for optimal performance</li>
                    <li>• <strong>Deep analysis:</strong> Slower but includes SMTP validation</li>
                    <li>• <strong>Fast mode:</strong> ~50 emails/second processing speed</li>
                    <li>• <strong>Large batches:</strong> Use multiple smaller batches for better reliability</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bulk Results */}
            {bulkResults && (
              <div className="space-y-6">
                {/* Performance Stats */}
                {bulkResults.performance && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        <span>Performance Metrics</span>
                      </h3>
                      <div className="flex items-center space-x-3">
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                          ⚡ Concurrent Processing
                        </span>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                          bulkResults.performance.throughput_rating === 'Excellent' ? 'bg-green-100 text-green-700' :
                          bulkResults.performance.throughput_rating === 'Good' ? 'bg-blue-100 text-blue-700' :
                          bulkResults.performance.throughput_rating === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {bulkResults.performance.throughput_rating} Throughput
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {(bulkResults.performance.processing_time_ms / 1000).toFixed(1)}s
                        </div>
                        <div className="text-sm text-gray-600">Total Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(bulkResults.performance.emails_per_second * 10) / 10}
                        </div>
                        <div className="text-sm text-gray-600">Emails/Second</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {bulkResults.performance.concurrent_workers}
                        </div>
                        <div className="text-sm text-gray-600">Workers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {bulkResults.performance.success_rate?.toFixed(1) || 100}%
                        </div>
                        <div className="text-sm text-gray-600">Success Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {bulkResults.performance.error_count || 0}
                        </div>
                        <div className="text-sm text-gray-600">Errors</div>
                      </div>
                    </div>
                    {bulkResults.limits && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600 flex items-center justify-between">
                          <span>Recommended batch size: <strong>{bulkResults.limits.recommended_batch_size}</strong></span>
                          <span>Current limit: <strong>{bulkResults.limits.max_emails_per_request}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Total', value: bulkResults.summary?.total || 0, color: 'bg-gray-100 text-gray-700' },
                    { label: 'Valid', value: bulkResults.summary?.valid || 0, color: 'bg-green-100 text-green-700' },
                    { label: 'Invalid', value: bulkResults.summary?.invalid || 0, color: 'bg-red-100 text-red-700' },
                    { label: 'Disposable', value: bulkResults.summary?.disposable || 0, color: 'bg-yellow-100 text-yellow-700' },
                    { label: 'Business', value: bulkResults.summary?.business || 0, color: 'bg-blue-100 text-blue-700' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-xl p-4 ${color}`}>
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-sm font-medium">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Results Table */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Analysis Results</h3>
                      <button className="flex items-center space-x-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        <Download className="h-4 w-4" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bulkResults.results?.slice(0, 10).map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(result.validation_score)}`}>
                                {result.validation_score}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {result.is_valid ? 
                                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                                  <XCircle className="h-4 w-4 text-red-600" />
                                }
                                <span className={`text-xs font-medium ${result.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                                  {result.is_valid ? 'Valid' : 'Invalid'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierColor(result.quality_tier)}`}>
                                {result.quality_tier}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                              {result.warnings?.length > 0 ? `${result.warnings.length} issues` : 'None'}
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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  title: 'Daily Requests', 
                  value: stats?.daily_requests || '1,250', 
                  change: '+12%', 
                  icon: Activity, 
                  color: 'text-blue-600 bg-blue-50' 
                },
                { 
                  title: 'Success Rate', 
                  value: `${stats?.success_rate || '98.5'}%`, 
                  change: '+0.3%', 
                  icon: TrendingUp, 
                  color: 'text-green-600 bg-green-50' 
                },
                { 
                  title: 'Avg Response', 
                  value: `${stats?.avg_response_time || '245'}ms`, 
                  change: '-15ms', 
                  icon: Clock, 
                  color: 'text-purple-600 bg-purple-50' 
                },
                { 
                  title: 'API Health', 
                  value: 'Excellent', 
                  change: 'Stable', 
                  icon: Shield, 
                  color: 'text-emerald-600 bg-emerald-50' 
                }
              ].map(({ title, value, change, icon: Icon, color }) => (
                <div key={title} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                      <p className="text-xs text-green-600 mt-1">{change}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Showcase */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <span>Platform Features</span>
                </h3>
                <div className="space-y-4">
                  {[
                    { 
                      feature: 'Advanced Syntax Validation', 
                      description: 'RFC 5322 compliant email format checking',
                      icon: CheckCircle,
                      status: 'Active'
                    },
                    { 
                      feature: 'Smart Disposable Detection', 
                      description: 'AI-powered temporary email identification',
                      icon: Eye,
                      status: 'Active'
                    },
                    { 
                      feature: 'SMTP Connection Testing', 
                      description: 'Real-time mailbox verification',
                      icon: Globe,
                      status: 'Premium'
                    },
                    { 
                      feature: 'Domain Reputation Analysis', 
                      description: 'Security and trust scoring',
                      icon: Shield,
                      status: 'Active'
                    }
                  ].map(({ feature, description, icon: Icon, status }) => (
                    <div key={feature} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{feature}</div>
                        <div className="text-sm text-gray-600">{description}</div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <span>Top Domains Today</span>
                </h3>
                <div className="space-y-3">
                  {(stats?.top_domains || ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']).map((domain, index) => (
                    <div key={domain} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{domain}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${100 - (index * 25)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{100 - (index * 25)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* API Documentation */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span>API Endpoints</span>
                </h3>
                <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                  All Systems Operational
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    method: 'POST',
                    endpoint: '/api/v1/analyze-email',
                    description: 'Comprehensive single email analysis',
                    status: 'operational'
                  },
                  {
                    method: 'POST',
                    endpoint: '/api/v1/bulk-analyze',
                    description: 'Bulk email analysis (up to 500)',
                    status: 'operational'
                  },
                  {
                    method: 'GET',
                    endpoint: '/api/v1/domain-info/:domain',
                    description: 'Domain information lookup',
                    status: 'operational'
                  },
                  {
                    method: 'GET',
                    endpoint: '/api/v1/health',
                    description: 'Service health check',
                    status: 'operational'
                  }
                ].map(({ method, endpoint, description, status }) => (
                  <div key={endpoint} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          method === 'POST' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {method}
                        </span>
                        <code className="text-sm font-mono text-gray-800">{endpoint}</code>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'operational' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sample Test Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-200">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Try These Test Examples</h3>
            <p className="text-gray-600">Click on any email below to test different validation scenarios</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-green-700 flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>✅ Valid Emails</span>
              </h4>
              {['john.doe@gmail.com', 'contact@company.com', 'user@outlook.com', 'info@business.org'].map(email => (
                <button
                  key={email}
                  onClick={() => { setEmail(email); setActiveTab('analyze'); }}
                  className="block w-full text-left px-3 py-2 text-sm bg-white rounded-lg hover:bg-green-50 hover:border-green-200 border border-gray-200 transition-all"
                >
                  {email}
                </button>
              ))}
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-red-700 flex items-center space-x-2">
                <XCircle className="h-4 w-4" />
                <span>❌ Invalid Emails</span>
              </h4>
              {['invalid-email', 'user@nonexistent.xyz', 'test@', '@domain.com'].map(email => (
                <button
                  key={email}
                  onClick={() => { setEmail(email); setActiveTab('analyze'); }}
                  className="block w-full text-left px-3 py-2 text-sm bg-white rounded-lg hover:bg-red-50 hover:border-red-200 border border-gray-200 transition-all"
                >
                  {email}
                </button>
              ))}
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-yellow-700 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>⚠️ Disposable/Risky</span>
              </h4>
              {['temp@10minutemail.com', 'user@tempmail.org', 'test@guerrillamail.com', 'fake@tempail.com'].map(email => (
                <button
                  key={email}
                  onClick={() => { setEmail(email); setActiveTab('analyze'); }}
                  className="block w-full text-left px-3 py-2 text-sm bg-white rounded-lg hover:bg-yellow-50 hover:border-yellow-200 border border-gray-200 transition-all"
                >
                  {email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">{process.env.REACT_APP_APP_NAME || 'Email Intelligence Platform'}</span>
              </div>
              <span className="text-sm text-gray-500">v1.0.0</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">Documentation</a>
              <a href="#" className="hover:text-gray-900 transition-colors">API Reference</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailIntelligencePlatform;