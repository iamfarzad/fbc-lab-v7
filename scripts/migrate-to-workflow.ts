#!/usr/bin/env tsx

/**
 * Migration script to transition from multi-agent system to Vercel Workflow
 * This script helps migrate existing conversation data and configurations
 */

import { createClient } from '@vercel/kv'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

interface MigrationStats {
  sessionsProcessed: number
  conversationsMigrated: number
  errors: number
  startTime: Date
  endTime?: Date
}

class WorkflowMigration {
  private kv: any
  private supabase: any
  private stats: MigrationStats

  constructor() {
    this.kv = createClient({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
    
    this.supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    this.stats = {
      sessionsProcessed: 0,
      conversationsMigrated: 0,
      errors: 0,
      startTime: new Date()
    }
  }

  async migrate() {
    console.log('🚀 Starting workflow migration...')
    console.log('📊 Initial stats:', this.stats)
    
    try {
      // Step 1: Migrate active sessions
      await this.migrateActiveSessions()
      
      // Step 2: Migrate conversation history
      await this.migrateConversationHistory()
      
      // Step 3: Update configuration
      await this.updateConfiguration()
      
      // Step 4: Validate migration
      await this.validateMigration()
      
      this.stats.endTime = new Date()
      console.log('✅ Migration completed successfully!')
      console.log('📊 Final stats:', this.stats)
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      this.stats.errors++
      throw error
    }
  }

  private async migrateActiveSessions() {
    console.log('🔄 Migrating active sessions...')
    
    try {
      // Get all active session keys from Redis
      const sessionKeys = await this.kv.keys('session:*')
      
      for (const key of sessionKeys) {
        try {
          const sessionData = await this.kv.get(key)
          if (sessionData) {
            // Convert session data to workflow format
            const workflowSession = this.convertSessionToWorkflow(sessionData)
            
            // Store in new workflow format
            await this.kv.set(`workflow:session:${key}`, workflowSession)
            
            this.stats.sessionsProcessed++
          }
        } catch (error) {
          console.error(`❌ Failed to migrate session ${key}:`, error)
          this.stats.errors++
        }
      }
      
      console.log(`✅ Migrated ${this.stats.sessionsProcessed} active sessions`)
      
    } catch (error) {
      console.error('❌ Failed to migrate active sessions:', error)
      throw error
    }
  }

  private async migrateConversationHistory() {
    console.log('🔄 Migrating conversation history...')
    
    try {
      // Get conversation history from Supabase
      const { data: conversations, error } = await this.supabase
        .from('conversation_contexts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000) // Process in batches
      
      if (error) {
        throw new Error(`Supabase error: ${error.message}`)
      }
      
      for (const conversation of conversations || []) {
        try {
          // Convert conversation to workflow format
          const workflowConversation = this.convertConversationToWorkflow(conversation)
          
          // Store in new workflow format
          await this.supabase
            .from('workflow_conversations')
            .insert(workflowConversation)
          
          this.stats.conversationsMigrated++
          
        } catch (error) {
          console.error(`❌ Failed to migrate conversation ${conversation.id}:`, error)
          this.stats.errors++
        }
      }
      
      console.log(`✅ Migrated ${this.stats.conversationsMigrated} conversations`)
      
    } catch (error) {
      console.error('❌ Failed to migrate conversation history:', error)
      throw error
    }
  }

  private async updateConfiguration() {
    console.log('🔄 Updating configuration...')
    
    try {
      // Update environment variables
      await this.kv.set('workflow:config', {
        enabled: true,
        version: '1.0.0',
        migratedAt: new Date().toISOString(),
        migrationStats: this.stats
      })
      
      console.log('✅ Configuration updated')
      
    } catch (error) {
      console.error('❌ Failed to update configuration:', error)
      throw error
    }
  }

  private async validateMigration() {
    console.log('🔄 Validating migration...')
    
    try {
      // Check workflow configuration
      const config = await this.kv.get('workflow:config')
      if (!config) {
        throw new Error('Workflow configuration not found')
      }
      
      // Check migrated sessions
      const sessionKeys = await this.kv.keys('workflow:session:*')
      if (sessionKeys.length === 0) {
        console.warn('⚠️  No sessions found in workflow format')
      }
      
      // Check migrated conversations
      const { count } = await this.supabase
        .from('workflow_conversations')
        .select('*', { count: 'exact', head: true })
      
      if (count === 0) {
        console.warn('⚠️  No conversations found in workflow format')
      }
      
      console.log('✅ Migration validation completed')
      
    } catch (error) {
      console.error('❌ Migration validation failed:', error)
      throw error
    }
  }

  private convertSessionToWorkflow(sessionData: any) {
    return {
      sessionId: sessionData.sessionId,
      status: 'active',
      context: {
        intelligenceContext: sessionData.intelligenceContext || {},
        conversationFlow: sessionData.conversationFlow || {},
        multimodalContext: sessionData.multimodalContext || {}
      },
      metadata: {
        createdAt: sessionData.createdAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  }

  private convertConversationToWorkflow(conversation: any) {
    return {
      session_id: conversation.session_id,
      workflow_id: `workflow-${conversation.id}`,
      stage: conversation.stage || 'DISCOVERY',
      context: conversation.context || {},
      messages: conversation.messages || [],
      metadata: {
        created_at: conversation.created_at,
        updated_at: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  }
}

// Main execution
async function main() {
  try {
    const migration = new WorkflowMigration()
    await migration.migrate()
    
    console.log('🎉 Workflow migration completed successfully!')
    process.exit(0)
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Run migration if called directly
if (require.main === module) {
  main()
}

export { WorkflowMigration }