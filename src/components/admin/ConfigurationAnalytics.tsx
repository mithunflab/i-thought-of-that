
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Settings, Database, TrendingUp, Activity, Globe, Youtube, Github } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ConfigurationAnalytics = () => {
  const [configData, setConfigData] = useState({
    deploymentSettings: 0,
    youtubeApiKeys: 0,
    openrouterApiKeys: 0,
    githubApiKeys: 0,
    netlifyApiKeys: 0,
    totalConfigurations: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
      const interval = setInterval(loadAnalyticsData, 30000);
      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading configuration analytics data...');

      // Fetch from all provider-specific tables
      const [youtubeResult, openrouterResult, githubResult, netlifyResult] = await Promise.all([
        supabase.from('youtube_api_keys').select('*').eq('is_active', true),
        supabase.from('openrouter_api_keys').select('*').eq('is_active', true),
        supabase.from('github_api_keys').select('*').eq('is_active', true),
        supabase.from('netlify_api_keys').select('*').eq('is_active', true)
      ]);

      if (youtubeResult.error) console.error('YouTube keys error:', youtubeResult.error);
      if (openrouterResult.error) console.error('OpenRouter keys error:', openrouterResult.error);
      if (githubResult.error) console.error('GitHub keys error:', githubResult.error);
      if (netlifyResult.error) console.error('Netlify keys error:', netlifyResult.error);

      const youtubeCount = youtubeResult.data?.length || 0;
      const openrouterCount = openrouterResult.data?.length || 0;
      const githubCount = githubResult.data?.length || 0;
      const netlifyCount = netlifyResult.data?.length || 0;
      
      const deploymentCount = githubCount + netlifyCount;
      const totalCount = youtubeCount + openrouterCount + githubCount + netlifyCount;

      // Create recent activity from all keys
      const allKeys = [
        ...(youtubeResult.data || []).map(key => ({ ...key, provider: 'YouTube' })),
        ...(openrouterResult.data || []).map(key => ({ ...key, provider: 'OpenRouter' })),
        ...(githubResult.data || []).map(key => ({ ...key, provider: 'GitHub' })),
        ...(netlifyResult.data || []).map(key => ({ ...key, provider: 'Netlify' }))
      ];

      const recentActivity = allKeys
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(key => ({
          type: key.provider,
          timestamp: new Date(key.created_at).toLocaleDateString(),
          count: 1
        }));

      console.log('Configuration counts:', {
        youtube: youtubeCount,
        openrouter: openrouterCount,
        github: githubCount,
        netlify: netlifyCount,
        deployment: deploymentCount,
        total: totalCount
      });

      setConfigData({
        deploymentSettings: deploymentCount,
        youtubeApiKeys: youtubeCount,
        openrouterApiKeys: openrouterCount,
        githubApiKeys: githubCount,
        netlifyApiKeys: netlifyCount,
        totalConfigurations: totalCount,
        recentActivity
      });
    } catch (err) {
      console.error('Error in loadAnalyticsData:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = [
    { name: 'Deployment Settings', value: configData.deploymentSettings, color: '#8b5cf6' },
    { name: 'YouTube API Keys', value: configData.youtubeApiKeys, color: '#ef4444' },
    { name: 'OpenRouter API Keys', value: configData.openrouterApiKeys, color: '#06b6d4' },
  ];

  const activityData = configData.recentActivity.reduce((acc, item) => {
    const existingDay = acc.find(d => d.date === item.timestamp);
    if (existingDay) {
      existingDay.configurations += 1;
    } else {
      acc.push({ date: item.timestamp, configurations: 1 });
    }
    return acc;
  }, [] as { date: string; configurations: number }[]).slice(0, 7);

  const chartConfig = {
    configurations: { label: 'Configurations', color: '#8b5cf6' }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-white">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Globe className="h-5 w-5 text-blue-400" />
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{configData.deploymentSettings}</p>
              <p className="text-xs text-gray-400">Deployment Configs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Youtube className="h-5 w-5 text-red-400" />
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{configData.youtubeApiKeys}</p>
              <p className="text-xs text-gray-400">YouTube API Keys</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Settings className="h-5 w-5 text-purple-400" />
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{configData.totalConfigurations}</p>
              <p className="text-xs text-gray-400">Total Configurations</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{configData.recentActivity.length}</p>
              <p className="text-xs text-gray-400">Recent Activities</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Distribution */}
        <Card className="bg-white/5 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database size={20} />
              Configuration Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="bg-white/5 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity size={20} />
              Configuration Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="configurations" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Summary */}
      <Card className="bg-white/5 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings size={20} />
            Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" />
                Deployment Settings
              </h3>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">GitHub Tokens</span>
                  <span className="text-white font-semibold">{configData.githubApiKeys}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Netlify Tokens</span>
                  <span className="text-white font-semibold">{configData.netlifyApiKeys}</span>
                </div>
                <div className="mt-2 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: configData.deploymentSettings > 0 ? '100%' : '0%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-400" />
                API Integrations
              </h3>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">YouTube API Keys</span>
                  <span className="text-white font-semibold">{configData.youtubeApiKeys}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">OpenRouter API Keys</span>
                  <span className="text-white font-semibold">{configData.openrouterApiKeys}</span>
                </div>
                <div className="mt-2 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: (configData.youtubeApiKeys + configData.openrouterApiKeys) > 0 ? '100%' : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigurationAnalytics;
