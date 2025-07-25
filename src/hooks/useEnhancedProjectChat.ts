
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useProjectContext } from './useProjectContext';
import { useTargetedChanges } from './useTargetedChanges';
import { useRepositoryManager } from './useRepositoryManager';
import { useRealTimeDeployment } from './useRealTimeDeployment';
import { generateReadme, generateProjectFeatures } from '../utils/readmeGenerator';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  feature?: string;
  generatedCode?: string;
  codeDescription?: string;
  githubUrl?: string;
  netlifyUrl?: string;
  fileChanges?: Array<{
    path: string;
    content: string;
    action: 'create' | 'update' | 'delete';
  }>;
}

interface ChannelData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  customUrl?: string;
  videos: any[];
}

interface ChatMetadata {
  feature?: string;
  generatedCode?: string;
  codeDescription?: string;
  githubUrl?: string;
  netlifyUrl?: string;
}

export const useEnhancedProjectChat = (youtubeUrl: string, projectIdea: string, channelData?: ChannelData | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId] = useState(() => crypto.randomUUID());
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Enhanced hooks
  const { context: projectContext, updateProjectContext } = useProjectContext(projectId, youtubeUrl);
  const { generateTargetedPrompt } = useTargetedChanges();
  const { getOrCreateRepository, updateRepository } = useRepositoryManager();
  const { deployToNetlify, deploymentStatus } = useRealTimeDeployment();

  // Load existing project if it exists
  const loadExistingProject = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔍 Loading existing project for URL:', youtubeUrl);
      
      const { data: existingProject } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('youtube_url', youtubeUrl)
        .single();
      
      if (existingProject) {
        setCurrentProject(existingProject);
        console.log('📂 Found existing project:', existingProject.name);
        
        // Load chat history
        const { data: chatHistory } = await supabase
          .from('project_chat_history')
          .select('*')
          .eq('project_id', existingProject.id)
          .order('created_at', { ascending: true });

        if (chatHistory && chatHistory.length > 0) {
          const loadedMessages: ChatMessage[] = chatHistory.map(msg => {
            const metadata = msg.metadata as ChatMetadata | null;
            return {
              id: msg.id,
              type: msg.message_type as 'user' | 'bot',
              content: msg.content,
              timestamp: new Date(msg.created_at),
              feature: metadata?.feature,
              generatedCode: metadata?.generatedCode,
              codeDescription: metadata?.codeDescription,
              githubUrl: metadata?.githubUrl,
              netlifyUrl: metadata?.netlifyUrl
            };
          });
          setMessages(loadedMessages);
          console.log('💬 Loaded chat history:', loadedMessages.length, 'messages');
        } else {
          // Add welcome message if no history
          const welcomeMessage = createWelcomeMessage();
          setMessages([welcomeMessage]);
        }
      } else {
        console.log('ℹ️ No existing project found, will create new one');
        const welcomeMessage = createWelcomeMessage();
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.log('ℹ️ No existing project found, will create new one');
      const welcomeMessage = createWelcomeMessage();
      setMessages([welcomeMessage]);
    }
  }, [user, youtubeUrl, channelData]);

  const createWelcomeMessage = (): ChatMessage => {
    if (channelData) {
      return {
        id: crypto.randomUUID(),
        type: 'bot',
        content: `🎥 **Welcome back to ${channelData.title} Website Builder!**\n\n` +
          `I'm your AI assistant with complete project memory. I can make targeted changes to specific elements without affecting your entire website.\n\n` +
          `**🧠 Project Context Loaded:**\n` +
          `• Channel: ${channelData.title}\n` +
          `• Subscribers: ${parseInt(channelData.subscriberCount).toLocaleString()}\n` +
          `• Videos: ${parseInt(channelData.videoCount).toLocaleString()}\n` +
          `• Current design and layout preserved\n` +
          `• Previous conversations remembered\n\n` +
          `**🎯 I can make targeted changes to:**\n` +
          `• Hero section (main title area)\n` +
          `• Navigation menu\n` +
          `• Video gallery with real thumbnails\n` +
          `• Statistics section with live data\n` +
          `• Call-to-action buttons\n` +
          `• Footer content\n` +
          `• Colors and styling\n\n` +
          `**💡 Tell me specifically what you'd like to change**, and I'll modify only that element while preserving everything else!\n\n` +
          `✨ **Real-time features active:** Live deployment, GitHub sync, project memory`,
        timestamp: new Date(),
        feature: 'welcome'
      };
    }

    return {
      id: crypto.randomUUID(),
      type: 'bot',
      content: `🎥 **Enhanced AI Website Builder Ready!**\n\n` +
        `I can create targeted changes to your website with complete project memory.\n\n` +
        `**🎯 Just tell me what specific element you'd like to modify!**`,
      timestamp: new Date(),
      feature: 'welcome'
    };
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the AI assistant",
        variant: "destructive"
      });
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setIsProcessing(true);

    // Add processing message
    const processingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'bot',
      content: `🔄 **Processing your request...**\n\nAnalyzing: "${content}"\n\n✨ Making targeted changes while preserving your design...`,
      timestamp: new Date(),
      feature: 'processing'
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      console.log('🤖 Processing targeted request with enhanced context...');
      
      // Generate targeted prompt based on project context
      const targetedPrompt = generateTargetedPrompt(
        content,
        currentProject?.source_code || '',
        projectContext,
        channelData
      );

      console.log('📝 Generated targeted prompt for AI');

      // Call the AI with enhanced context and real channel data
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('chat', {
        body: {
          message: targetedPrompt,
          projectId: currentProject?.id || projectId,
          channelData: channelData,
          chatHistory: messages.slice(-10),
          generateCode: true,
          projectContext: projectContext,
          isTargetedChange: true,
          currentCode: currentProject?.source_code || '',
          preserveDesign: true
        }
      });

      if (aiError) {
        console.error('❌ AI API Error:', aiError);
        throw new Error(`AI API Error: ${aiError.message}`);
      }

      console.log('✅ AI Response received with enhanced context');

      // Remove processing message and add real response
      setMessages(prev => prev.filter(msg => msg.feature !== 'processing'));

      // Create enhanced AI response message
      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'bot',
        content: aiResponse.reply || 'I\'ve made the targeted changes to your website!',
        timestamp: new Date(),
        feature: aiResponse.feature || 'targeted-modification',
        generatedCode: aiResponse.generatedCode,
        codeDescription: aiResponse.codeDescription
      };

      // Handle repository and deployment management
      if (aiResponse.generatedCode) {
        console.log('🚀 Processing targeted changes with enhanced project management...');
        
        try {
          const projectName = currentProject?.name || `${channelData?.title || 'AI'}-website-${Date.now()}`.replace(/\s+/g, '-');
          const projectDescription = `AI-generated website for ${channelData?.title || 'custom project'} with real-time features`;
          
          // Get or create repository (only creates if none exists)
          const repoInfo = await getOrCreateRepository(
            currentProject?.id || projectId,
            projectName,
            channelData
          );

          if (repoInfo) {
            // Generate enhanced README with project context
            const readmeContent = generateReadme({
              title: projectName,
              description: projectDescription,
              channelData: channelData,
              features: generateProjectFeatures(projectIdea, channelData, aiResponse.generatedCode),
              designPrinciples: projectContext?.designPrinciples || [],
              currentStructure: projectContext?.currentStructure || { components: [], styling: { colors: [] }, layout: 'default' },
              githubUrl: repoInfo.githubUrl,
              netlifyUrl: repoInfo.netlifyUrl,
              lastModified: new Date()
            });

            // Update repository with new files (targeted changes)
            const filesToUpdate = [
              { 
                path: 'index.html', 
                content: aiResponse.generatedCode,
                message: `🎯 Targeted modification: ${content.substring(0, 50)}...`
              },
              { 
                path: 'README.md', 
                content: readmeContent,
                message: '📝 Update project documentation with latest changes'
              }
            ];

            await updateRepository(repoInfo.githubUrl, filesToUpdate);
            botMessage.githubUrl = repoInfo.githubUrl;

            // Deploy to Netlify (updates existing site or creates new one)
            const netlifyUrl = await deployToNetlify(
              currentProject?.id || projectId,
              projectName,
              aiResponse.generatedCode,
              currentProject?.netlify_url
            );

            if (netlifyUrl) {
              botMessage.netlifyUrl = netlifyUrl;
            }

            // Save/update project in database
            const projectData = {
              user_id: user.id,
              name: projectName,
              description: projectDescription,
              youtube_url: youtubeUrl,
              channel_data: channelData as any,
              source_code: aiResponse.generatedCode,
              github_url: repoInfo.githubUrl,
              netlify_url: netlifyUrl || currentProject?.netlify_url,
              status: 'active'
            };

            if (currentProject) {
              await supabase
                .from('projects')
                .update({
                  ...projectData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', currentProject.id);
              
              console.log('✅ Project updated with targeted changes');
            } else {
              const { data: newProject } = await supabase
                .from('projects')
                .insert({
                  ...projectData,
                  id: projectId
                })
                .select()
                .single();

              if (newProject) {
                setCurrentProject(newProject);
                console.log('✅ New project created with enhanced features');
              }
            }

            // Update project context
            await updateProjectContext({
              currentStructure: projectContext?.currentStructure || { components: [], styling: { colors: [] }, layout: 'default' }
            });

            toast({
              title: "🎯 Targeted Changes Applied!",
              description: `Your specific modifications are live at ${netlifyUrl || repoInfo.netlifyUrl}`,
            });
          }

        } catch (deployError) {
          console.error('❌ Deployment failed:', deployError);
          toast({
            title: "Deployment Error",
            description: "Changes generated but deployment failed. Check console for details.",
            variant: "destructive"
          });
        }
      }

      setMessages(prev => [...prev, botMessage]);

      // Save chat message to history
      const projectIdToUse = currentProject?.id || projectId;
      
      await supabase
        .from('project_chat_history')
        .insert({
          project_id: projectIdToUse,
          user_id: user.id,
          message_type: 'user',
          content: content
        });

      await supabase
        .from('project_chat_history')
        .insert({
          project_id: projectIdToUse,
          user_id: user.id,
          message_type: 'assistant',
          content: botMessage.content,
          metadata: {
            feature: botMessage.feature,
            generatedCode: botMessage.generatedCode,
            codeDescription: botMessage.codeDescription,
            githubUrl: botMessage.githubUrl,
            netlifyUrl: botMessage.netlifyUrl
          }
        });

      console.log('💾 Chat history saved to database');

    } catch (error) {
      console.error('❌ Error in enhanced sendMessage:', error);
      
      // Remove processing message
      setMessages(prev => prev.filter(msg => msg.feature !== 'processing'));
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: 'bot',
        content: `❌ **Error Processing Request**\n\nSorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔄 Please try again with a more specific request.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  }, [user, projectId, channelData, youtubeUrl, toast, generateTargetedPrompt, getOrCreateRepository, updateRepository, deployToNetlify, currentProject, projectContext, updateProjectContext, messages]);

  // Load existing project on mount
  useEffect(() => {
    loadExistingProject();
  }, [loadExistingProject]);

  return {
    messages,
    loading,
    sendMessage,
    projectId: currentProject?.id || projectId,
    currentProject,
    deploymentStatus,
    isProcessing
  };
};
