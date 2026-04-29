import { Skeleton } from "@/components/ui/skeleton";

export const AppSkeleton = () => {
  return (
    <div className="h-screen flex flex-col w-full bg-background overflow-hidden">
      {/* Skeleton Header */}
      <div className="h-16 border-b flex items-center px-6 justify-between flex-shrink-0">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Skeleton Sidebar (Desktop) */}
        <div className="hidden md:block w-64 border-r p-4 space-y-4 flex-shrink-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>

        {/* Skeleton Content */}
        <main className="flex-1 p-6 space-y-6 overflow-hidden">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
            <Skeleton className="md:col-span-2 h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden h-16 border-t grid grid-cols-4 items-center px-2 flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-2 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
};