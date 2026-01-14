-- Add streamline column
ALTER TABLE "users" ADD COLUMN "streamline" INTEGER;

-- Update existing users with streamline numbers based on their registration order (id)
UPDATE "users" 
SET "streamline" = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
  FROM "users"
) sub
WHERE "users".id = sub.id;

-- Make streamline unique and NOT NULL
ALTER TABLE "users" ALTER COLUMN "streamline" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_streamline_key" UNIQUE ("streamline");
