 import { format, isToday, isYesterday, differenceInDays } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { cn } from "@/lib/utils";
 
 interface DateSeparatorProps {
   date: Date;
   className?: string;
 }
 
 function formatDateLabel(date: Date): string {
   if (isToday(date)) return "Hoje";
   if (isYesterday(date)) return "Ontem";
   
   const daysAgo = differenceInDays(new Date(), date);
   if (daysAgo < 7) {
     // Capitalize first letter
     const dayName = format(date, "EEEE", { locale: ptBR });
     return dayName.charAt(0).toUpperCase() + dayName.slice(1);
   }
   
   return format(date, "dd/MM/yyyy");
 }
 
 export function DateSeparator({ date, className }: DateSeparatorProps) {
   const label = formatDateLabel(date);
   
   return (
     <div className={cn("flex items-center justify-center py-3", className)}>
       <div className="px-3 py-1 bg-muted/80 rounded-full text-xs text-muted-foreground font-medium shadow-sm">
         {label}
       </div>
     </div>
   );
 }
 
 /**
  * Hook helper to check if date separator should be shown between messages
  */
 export function shouldShowDateSeparator(
   currentDate: string,
   previousDate: string | null
 ): boolean {
   if (!previousDate) return true;
   
   const current = format(new Date(currentDate), "yyyy-MM-dd");
   const previous = format(new Date(previousDate), "yyyy-MM-dd");
   
   return current !== previous;
 }