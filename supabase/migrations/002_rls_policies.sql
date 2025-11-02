-- BitcoinLatte Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Shops Policies
CREATE POLICY "Approved shops are viewable by everyone"
  ON public.shops FOR SELECT
  USING (approved = true OR auth.role() = 'authenticated');

CREATE POLICY "Admins can insert shops"
  ON public.shops FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update shops"
  ON public.shops FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete shops"
  ON public.shops FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Submissions Policies
CREATE POLICY "Anyone can submit shops"
  ON public.submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own submissions"
  ON public.submissions FOR SELECT
  USING (submitted_by = auth.uid() OR submitted_by IS NULL);

CREATE POLICY "Admins can view all submissions"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update submissions"
  ON public.submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete submissions"
  ON public.submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Shop Images Policies
CREATE POLICY "Shop images are viewable by everyone"
  ON public.shop_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upload shop images"
  ON public.shop_images FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Image owner or admin can delete shop images"
  ON public.shop_images FOR DELETE
  USING (
    auth.uid() = uploaded_by OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Submission Images Policies
CREATE POLICY "Users can view images for their submissions"
  ON public.submission_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions
      WHERE id = submission_id AND (submitted_by = auth.uid() OR submitted_by IS NULL)
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Anyone can upload submission images"
  ON public.submission_images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete submission images"
  ON public.submission_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Comments Policies
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment"
  ON public.comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Votes Policies
CREATE POLICY "Vote counts are viewable by everyone"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON public.votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);