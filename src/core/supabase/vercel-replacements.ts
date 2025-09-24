/**
 * Vercel Pro Features Replacement with Supabase Free Tier
 * This module provides TypeScript types and utilities for feature flags, caching, 
 * file storage, and cron jobs using Supabase instead of Vercel Pro services.
 */

import { getSupabaseServer } from '@/src/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureFlag {
  id: string
  flag_key: string
  flag_name: string
  description?: string
  is_enabled: boolean
  rollout_percentage: number
  target_users?: string[]
  target_environments: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface CacheEntry {
  cache_key: string
  cache_value: any
  ttl_seconds: number
  created_at: string
  expires_at: string
}

export interface FileMetadata {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  bucket_name: string
  user_id?: string
  is_public: boolean
  access_level: 'private' | 'authenticated' | 'public'
  tags?: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CronJobLog {
  id: string
  job_name: string
  job_type: 'github_action' | 'edge_function' | 'database_trigger'
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  duration_ms?: number
  error_message?: string
  result_data?: Record<string, any>
  metadata?: Record<string, any>
}

// ============================================================================
// FEATURE FLAGS SYSTEM (Replaces Vercel Edge Config)
// ============================================================================

export class FeatureFlagsManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Check if a feature flag is enabled for a user
   * @param flagKey - The feature flag key
   * @param userId - Optional user ID for targeted rollouts
   * @param environment - Current environment (default: 'production')
   */
  async isEnabled(
    flagKey: string, 
    userId?: string, 
    environment: string = 'production'
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('get_feature_flag', {
        flag_key: flagKey,
        user_id: userId,
        environment: environment
      })

      if (error) {
        console.error('Feature flag check error:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Feature flag check failed:', error)
      return false
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await this.supabase
        .from('feature_flags')
        .select('*')
        .order('flag_key')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get feature flags:', error)
      return []
    }
  }

  /**
   * Update a feature flag (admin only)
   */
  async updateFlag(flagKey: string, updates: Partial<FeatureFlag>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('feature_flags')
        .update(updates)
        .eq('flag_key', flagKey)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Failed to update feature flag:', error)
      return false
    }
  }

  /**
   * Enable/disable a feature flag
   */
  async toggleFlag(flagKey: string, enabled: boolean): Promise<boolean> {
    return this.updateFlag(flagKey, { is_enabled: enabled })
  }
}

// ============================================================================
// CACHING LAYER (Replaces Vercel KV)
// ============================================================================

export class CacheManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  // Cache operations (replaces Vercel KV)
  async setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('update_cache', {
        cache_key: key,
        cache_value: value,
        ttl_seconds: ttlSeconds
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to set cache:', error);
      throw error;
    }
  }

  async getCache(key: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('get_cache', {
        cache_key: key
      });
      
      if (error) throw error;
      return data === 'null' ? null : data;
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  async clearCache(key?: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('clear_cache', {
        cache_key: key || null
      });
      
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('cache_stats')
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return null
    }
  }
}

// ============================================================================
// FILE STORAGE (Replaces Vercel Blob)
// ============================================================================

export class FileStorageManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Upload a file to Supabase Storage
   * @param bucket - Storage bucket name
   * @param path - File path in bucket
   * @param file - File to upload
   * @param options - Upload options
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Blob,
    options: {
      userId?: string
      isPublic?: boolean
      accessLevel?: 'private' | 'authenticated' | 'public'
      tags?: string[]
      metadata?: Record<string, any>
    } = {}
  ): Promise<FileMetadata | null> {
    try {
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Create metadata record
      const { data: metadata, error: metadataError } = await this.supabase.rpc('create_file_record', {
        file_name: path.split('/').pop() || 'unknown',
        file_path: path,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        bucket_name: bucket,
        user_id: options.userId,
        is_public: options.isPublic || false,
        access_level: options.accessLevel || 'private',
        tags: options.tags || [],
        metadata: options.metadata || {}
      })

      if (metadataError) throw metadataError

      return metadata
    } catch (error) {
      console.error('File upload failed:', error)
      return null
    }
  }

  /**
   * Get file metadata
   * @param fileId - File ID
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const { data, error } = await this.supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to get file metadata:', error)
      return null
    }
  }

  /**
   * Get public URL for a file
   * @param bucket - Storage bucket name
   * @param path - File path in bucket
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  }

  /**
   * Delete a file
   * @param bucket - Storage bucket name
   * @param path - File path in bucket
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error
      return true
    } catch (error) {
      console.error('File deletion failed:', error)
      return false
    }
  }
}

// ============================================================================
// CRON JOBS (Replaces Vercel Cron)
// ============================================================================

export class CronJobManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Log the start of a cron job
   * @param jobName - Name of the job
   * @param jobType - Type of job execution
   */
  async logJobStart(
    jobName: string, 
    jobType: 'github_action' | 'edge_function' | 'database_trigger' = 'edge_function'
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('log_cron_job_start', {
        job_name: jobName,
        job_type: jobType
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to log job start:', error)
      return null
    }
  }

  /**
   * Log the completion of a cron job
   * @param jobId - Job ID from logJobStart
   * @param status - Job completion status
   * @param resultData - Optional result data
   * @param errorMessage - Optional error message
   */
  async logJobComplete(
    jobId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed',
    resultData?: Record<string, any>,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.rpc('log_cron_job_complete', {
        job_id: jobId,
        status: status,
        result_data: resultData || {},
        error_message: errorMessage
      })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Failed to log job completion:', error)
      return false
    }
  }

  /**
   * Get cron job statistics
   */
  async getJobStats(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('cron_job_stats')
        .select('*')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get job stats:', error)
      return []
    }
  }

  /**
   * Get recent job logs
   * @param limit - Number of logs to return
   */
  async getRecentLogs(limit: number = 50): Promise<CronJobLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('cron_job_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get recent logs:', error)
      return []
    }
  }
}

// ============================================================================
// MAIN MANAGER CLASS
// ============================================================================

export class VercelReplacementManager {
  public featureFlags: FeatureFlagsManager
  public cache: CacheManager
  public fileStorage: FileStorageManager
  public cronJobs: CronJobManager

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    const supabase = getSupabaseServer();
    
    this.featureFlags = new FeatureFlagsManager(supabase)
    this.cache = new CacheManager(supabase)
    this.fileStorage = new FileStorageManager(supabase)
    this.cronJobs = new CronJobManager(supabase)
  }

  /**
   * Initialize all systems and verify they're working
   */
  async initialize(): Promise<boolean> {
    try {
      // Test feature flags
      const flagsTest = await this.featureFlags.getAllFlags()
      
      // Test cache
      await this.cache.setCache('test', { message: 'Cache is working' }, 60)
      const cacheTest = await this.cache.getCache('test')
      
      // Test cron jobs
      const jobId = await this.cronJobs.logJobStart('initialization_test')
      if (jobId) {
        await this.cronJobs.logJobComplete(jobId, 'completed', { test: true })
      }

      console.log('✅ Vercel Replacement Manager initialized successfully')
      console.log(`📊 Feature flags: ${flagsTest.length} available`)
      console.log(`💾 Cache: ${cacheTest ? 'working' : 'failed'}`)
      console.log(`🔄 Cron jobs: ${jobId ? 'working' : 'failed'}`)

      return true
    } catch (error) {
      console.error('❌ Vercel Replacement Manager initialization failed:', error)
      return false
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a Vercel Replacement Manager instance
 */
export function createVercelReplacementManager(
  supabaseUrl: string, 
  supabaseAnonKey: string
): VercelReplacementManager {
  return new VercelReplacementManager(supabaseUrl, supabaseAnonKey)
}

/**
 * Quick feature flag check
 */
export async function isFeatureEnabled(
  flagKey: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  userId?: string,
  environment: string = 'production'
): Promise<boolean> {
  const manager = createVercelReplacementManager(supabaseUrl, supabaseAnonKey)
  return manager.featureFlags.isEnabled(flagKey, userId, environment)
}

/**
 * Quick cache operations
 */
export async function quickCache(
  action: 'get' | 'set' | 'delete',
  key: string,
  value?: any,
  ttl?: number,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<any> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials required for cache operations')
  }

  const manager = createVercelReplacementManager(supabaseUrl, supabaseAnonKey)
  
  switch (action) {
    case 'get':
      return manager.cache.getCache(key)
    case 'set':
      if (value === undefined) throw new Error('Value required for cache set')
      return manager.cache.setCache(key, value, ttl)
    case 'delete':
      return manager.cache.clearCache(key)
    default:
      throw new Error(`Unknown cache action: ${action}`)
  }
}
