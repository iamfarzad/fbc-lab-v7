'use client';

import { useState } from 'react';
import { useChat, useChatMessages, useChatStatus, useChatActions } from '@ai-sdk-tools/store';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
} from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { PromptInput } from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { Reasoning } from '@/components/ai-elements/reasoning';
import { Actions } from '@/components/ai-elements/actions';
import { Suggestion } from '@/components/ai-elements/suggestion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AnalyticsDashboard from './AnalyticsDashboard';
import { 
  SendIcon, 
  BotIcon, 
  UserIcon, 
  CodeIcon, 
  LightbulbIcon,
  MessageSquareIcon,
  LoaderIcon,
  TrashIcon
} from 'lucide-react';

export default function ChatInterface() {
  const [showReasoning, setShowReasoning] = useState(false);
  const [input, setInput] = useState('');

  // Initialize chat with global state management
  useChat({
    api: '/api/chat',
  });

  // Access state from anywhere without prop drilling
  const messages = useChatMessages();
  const status = useChatStatus();
  const { sendMessage } = useChatActions();

  const isLoading = status === 'streaming';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    await sendMessage({ text: input });
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  const userMessages = messages.filter(msg => msg.role === 'user').length;
  const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;

  const quickSuggestions = [
    'Explain React hooks',
    'Write a TypeScript function',
    'Help with debugging',
    'Create a todo component',
    'Optimize performance'
  ];

  const handleSuggestionClick = (suggestion: string) => {
    // This would need to be implemented with the store's input handling
    console.log('Suggestion clicked:', suggestion);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
        <div className="flex items-center gap-3">
          <MessageSquareIcon className="h-4 w-4" />
          <span className="text-sm font-medium">F.B/c AI Chat</span>
          <Badge variant="secondary" className="text-xs">
            {messages.length} messages
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          {isLoading && (
            <>
              <LoaderIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </>
          )}
          {status === 'ready' && (
            <Badge variant="outline" className="text-xs">
              Ready
            </Badge>
          )}
          {status === 'error' && (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <Conversation>
              <ConversationContent>
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    title="Welcome to F.B/c AI"
                    description="Start a conversation to see AI responses here"
                    icon={<BotIcon className="h-8 w-8" />}
                  />
                ) : (
                  messages.map((message, index) => (
                    <Message key={index} from={message.role}>
                      <MessageContent>
                        <Response>{message.content}</Response>
                        
                        {/* Show reasoning for assistant messages */}
                        {message.role === 'assistant' && showReasoning && (
                          <Reasoning>
                            <p>I analyzed your request and provided a comprehensive response based on the context.</p>
                          </Reasoning>
                        )}
                        
                        {/* Show code block for code-related responses */}
                        {message.content.includes('```') && (
                          <CodeBlock
                            language="typescript"
                            code={message.content.match(/```[\s\S]*?```/)?.[0]?.replace(/```/g, '') || ''}
                          />
                        )}
                      </MessageContent>
                    </Message>
                  ))
                )}
                {isLoading && (
                  <Message from="assistant">
                    <MessageContent>
                      <Loader />
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>
          
          {/* Input Area */}
          <div className="border-t p-4 space-y-4">
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion, index) => (
                <Suggestion 
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Suggestion>
              ))}
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <PromptInput
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <SendIcon className="h-4 w-4" />
              </Button>
            </form>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Actions>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReasoning(!showReasoning)}
                >
                  {showReasoning ? 'Hide' : 'Show'} Reasoning
                </Button>
                <Button variant="outline" size="sm">
                  Export Chat
                </Button>
                <Button variant="outline" size="sm">
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Clear History
                </Button>
              </Actions>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-muted/20 p-4">
          <div className="space-y-4">
            {/* Analytics Dashboard */}
            <AnalyticsDashboard />
            
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Chat Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Messages</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Your Messages</span>
                  <div className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    <span className="font-medium">{userMessages}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI Responses</span>
                  <div className="flex items-center gap-1">
                    <BotIcon className="h-3 w-3" />
                    <span className="font-medium">{assistantMessages}</span>
                  </div>
                </div>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Recent Messages</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {messages.slice(-5).map((message, index) => (
                    <div key={index} className="text-xs p-2 bg-background rounded border">
                      <div className="flex items-center gap-1 mb-1">
                        {message.role === 'user' ? (
                          <UserIcon className="h-3 w-3" />
                        ) : (
                          <BotIcon className="h-3 w-3" />
                        )}
                        <span className="font-medium capitalize">{message.role}</span>
                      </div>
                      <p className="text-muted-foreground truncate">
                        {message.content.slice(0, 50)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
