import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoardCover } from "@/features/boards/api/useBoardCover";
import { Id } from "../../convex/_generated/dataModel";

interface BoardCardProps {
  id: Id<"boards">;
  name: string;
}

export const BoardCard = ({ id, name }: BoardCardProps) => {
  const { data: cover, isLoading } = useBoardCover({ boardId: id });

  if (isLoading) {
    return (
      <div className="aspect-[16/9] rounded-lg overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <Link href={`/${id}/${name}`}>
      <div className="group aspect-[16/9] relative rounded-lg overflow-hidden border border-[#3a3a3a] hover:border-[#4a4a4a] transition-all">
        {cover?.url ? (
          <Image
            src={cover.url}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-[#2a2a2a]" />
        )}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold truncate">{name}</h3>
        </div>
      </div>
    </Link>
  );
};