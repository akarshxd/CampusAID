-- AlterTable
ALTER TABLE "HelpRequest" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "helperId" TEXT;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
