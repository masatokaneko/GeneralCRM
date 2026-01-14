import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormField } from "./FormField";

const meta: Meta<typeof FormField> = {
  title: "molecules/FormField",
  component: FormField,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Email",
    placeholder: "Enter your email",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Username",
    placeholder: "Enter username",
    description: "Your unique username for the platform",
  },
};

export const WithError: Story = {
  args: {
    label: "Password",
    type: "password",
    placeholder: "Enter password",
    error: "Password must be at least 8 characters",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled Field",
    placeholder: "Cannot edit",
    disabled: true,
  },
};
