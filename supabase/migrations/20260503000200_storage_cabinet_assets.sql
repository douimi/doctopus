-- Public bucket for cabinet logo / signature / stamp images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cabinet-assets', 'cabinet-assets', true)
ON CONFLICT (id) DO NOTHING;
