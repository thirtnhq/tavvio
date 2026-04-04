/* ── Utils ── */
export { cn } from "./utils";

/* ══════════════════════════════════════════════════════════════
 * Custom Useroutr Components (hand-built, domain-specific)
 * ══════════════════════════════════════════════════════════════ */

/* ── Priority 1 — Core components ── */
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export {
  Input,
  Textarea,
  type InputProps,
  type TextareaProps,
} from "./components/input";
export { Badge, badgeVariants } from "./components/badge";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  MetricCard,
} from "./components/card";
export { DataTable, type Column } from "./components/data-table";
export { Modal } from "./components/modal";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";
export { Drawer } from "./components/drawer";
export { ToastProvider, useToast } from "./components/toast";
export { Skeleton } from "./components/skeleton";
export { EmptyState } from "./components/empty-state";
export { Pagination } from "./components/pagination";

/* ── Priority 2 — Form & specialized ── */
export { Select, type SelectOption } from "./components/select";
export { Switch } from "./components/switch";
export { Label } from "./components/label";
export { DatePicker, DateRangePicker } from "./components/date-picker";
export { FileUpload } from "./components/file-upload";
export {
  CurrencyInput,
  type CurrencyOption,
} from "./components/currency-input";
export { Separator } from "./components/separator";
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./components/tooltip";

/* ── Charts ── */
export { LineChart } from "./components/charts/line-chart";
export { BarChart } from "./components/charts/bar-chart";
export { DonutChart } from "./components/charts/donut-chart";

/* ══════════════════════════════════════════════════════════════
 * shadcn/ui Components (managed via `npx shadcn add <component>`)
 *
 * Usage:
 *   import { ShadButton } from "@useroutr/ui"
 *   — or —
 *   import { Button } from "@useroutr/ui/components/ui/button"
 * ══════════════════════════════════════════════════════════════ */

/* Re-export shadcn primitives with Shad prefix to avoid conflicts */
export {
  Button as ShadButton,
  buttonVariants as shadButtonVariants,
} from "./components/ui/button";
export {
  Badge as ShadBadge,
  badgeVariants as shadBadgeVariants,
} from "./components/ui/badge";
export {
  Card as ShadCard,
  CardHeader as ShadCardHeader,
  CardTitle as ShadCardTitle,
  CardDescription as ShadCardDescription,
  CardContent as ShadCardContent,
  CardFooter as ShadCardFooter,
} from "./components/ui/card";
export {
  Dialog as ShadDialog,
  DialogPortal as ShadDialogPortal,
  DialogOverlay as ShadDialogOverlay,
  DialogClose as ShadDialogClose,
  DialogTrigger as ShadDialogTrigger,
  DialogContent as ShadDialogContent,
  DialogHeader as ShadDialogHeader,
  DialogFooter as ShadDialogFooter,
  DialogTitle as ShadDialogTitle,
  DialogDescription as ShadDialogDescription,
} from "./components/ui/dialog";
export { Input as ShadInput } from "./components/ui/input";
export { Textarea as ShadTextarea } from "./components/ui/textarea";
export { Label as ShadLabel } from "./components/ui/label";
export {
  Select as ShadSelect,
  SelectContent as ShadSelectContent,
  SelectGroup as ShadSelectGroup,
  SelectItem as ShadSelectItem,
  SelectLabel as ShadSelectLabel,
  SelectScrollDownButton as ShadSelectScrollDownButton,
  SelectScrollUpButton as ShadSelectScrollUpButton,
  SelectSeparator as ShadSelectSeparator,
  SelectTrigger as ShadSelectTrigger,
  SelectValue as ShadSelectValue,
} from "./components/ui/select";
export { Separator as ShadSeparator } from "./components/ui/separator";
export { Skeleton as ShadSkeleton } from "./components/ui/skeleton";
export { Switch as ShadSwitch } from "./components/ui/switch";
export {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipProvider as ShadTooltipProvider,
  TooltipTrigger as ShadTooltipTrigger,
} from "./components/ui/tooltip";
export { Checkbox as ShadCheckbox } from "./components/ui/checkbox";
export {
  RadioGroup as ShadRadioGroup,
  RadioGroupItem as ShadRadioGroupItem,
} from "./components/ui/radio-group";
export { Progress as ShadProgress } from "./components/ui/progress";
export { Slider as ShadSlider } from "./components/ui/slider";

/* shadcn-only components (no custom equivalent) */
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
export { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./components/ui/command";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./components/ui/form";
export {
  Popover as ShadPopover,
  PopoverContent as ShadPopoverContent,
  PopoverTrigger as ShadPopoverTrigger,
} from "./components/ui/popover";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
export {
  Table as ShadTable,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter as ShadTableFooter,
  TableHead,
  TableHeader as ShadTableHeader,
  TableRow,
} from "./components/ui/table";
export { Toaster } from "./components/ui/sonner";
export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from "./components/ui/field";
export * from "./components/ui/sidebar";
