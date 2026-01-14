// Components barrel export - Atomic Design structure
export * from "./atoms";
export * from "./layouts";
export * from "./templates";

// Explicit exports from molecules to avoid conflicts with organisms
export { FormField, type FormFieldProps } from "./molecules/FormField";

// Explicit exports from organisms to avoid conflicts
// Note: FormField type is from RecordForm, Column type is from RelatedList
// We export the component from molecules and the type from organisms with different names
export {
  Modal,
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
  type ModalProps,
} from "./organisms/Modal";
export {
  Toast,
  Toaster,
  toast,
  useToast,
  type ToastProps,
} from "./organisms/Toast";
export { RecordForm, type RecordFormProps, type FormSection, type FieldType, type SelectOption } from "./organisms/RecordForm";
export type { FormField as RecordFormField } from "./organisms/RecordForm";
export { RelatedList, type RelatedListProps } from "./organisms/RelatedList";
export type { Column as RelatedListColumn } from "./organisms/RelatedList";
