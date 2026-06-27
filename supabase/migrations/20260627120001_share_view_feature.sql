-- ============================================================
-- B1: 分享即积分功能
-- 1) 扩展 contribution_kind 枚举，追加 share_view
-- 2) 创建 share_views 去重表
-- ============================================================

-- 扩展枚举
ALTER TYPE public.contribution_kind ADD VALUE IF NOT EXISTS 'share_view';

-- 创建 share_views 去重表
CREATE TABLE IF NOT EXISTS public.share_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sharer_id uuid NOT NULL REFERENCES public.profiles(id),
  viewer_fingerprint text NOT NULL,
  source_type text NOT NULL,  -- 'object_card' | 'profile_card'
  object_id uuid,            -- 仅 object_card 时填充
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_views_sharer ON share_views(sharer_id, created_at);
