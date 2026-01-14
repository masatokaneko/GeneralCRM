"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { useGlobalSearch, type SearchResult } from "@/lib/api/search";
import {
  Search,
  Building2,
  Users,
  UserPlus,
  Target,
  FileText,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const objectTypeConfig: Record<
  SearchResult["objectType"],
  { icon: React.ReactNode; color: string; href: (id: string) => string }
> = {
  Account: {
    icon: <Building2 className="h-5 w-5" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    href: (id) => `/accounts/${id}`,
  },
  Contact: {
    icon: <Users className="h-5 w-5" />,
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    href: (id) => `/contacts/${id}`,
  },
  Lead: {
    icon: <UserPlus className="h-5 w-5" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    href: (id) => `/leads/${id}`,
  },
  Opportunity: {
    icon: <Target className="h-5 w-5" />,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    href: (id) => `/opportunities/${id}`,
  },
  Quote: {
    icon: <FileText className="h-5 w-5" />,
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    href: (id) => `/quotes/${id}`,
  },
};

function SearchResultCard({ result }: { result: SearchResult }) {
  const config = objectTypeConfig[result.objectType];

  return (
    <Link
      href={config.href(result.id)}
      className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.name}</span>
          <Badge variant="outline" className="text-xs">
            {result.objectType}
          </Badge>
        </div>
        {result.subtitle && (
          <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
        )}
        {result.matchedField && result.matchedValue && (
          <p className="mt-1 text-xs text-muted-foreground">
            Matched: <span className="font-medium">{result.matchedField}</span> = "
            <span className="text-primary">{result.matchedValue}</span>"
          </p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function GroupedResults({ results }: { results: SearchResult[] }) {
  const grouped = results.reduce(
    (acc, result) => {
      if (!acc[result.objectType]) {
        acc[result.objectType] = [];
      }
      acc[result.objectType].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const objectTypes: SearchResult["objectType"][] = [
    "Account",
    "Contact",
    "Lead",
    "Opportunity",
    "Quote",
  ];

  return (
    <div className="space-y-8">
      {objectTypes.map((objectType) => {
        const items = grouped[objectType];
        if (!items || items.length === 0) return null;

        const config = objectTypeConfig[objectType];

        return (
          <div key={objectType}>
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded", config.color)}>
                {React.isValidElement(config.icon)
                  ? React.cloneElement(config.icon as React.ReactElement<{ className?: string }>, { className: "h-4 w-4" })
                  : config.icon}
              </div>
              <h2 className="font-semibold">{objectType}s</h2>
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {items.map((result) => (
                <SearchResultCard key={result.id} result={result} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = React.useState(initialQuery);
  const [searchTerm, setSearchTerm] = React.useState(initialQuery);

  const { data, isLoading, error } = useGlobalSearch(searchTerm);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchTerm(query.trim());
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold">Global Search</h1>
        <p className="text-muted-foreground">
          Search across Accounts, Contacts, Leads, Opportunities, and Quotes
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, phone, company..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={!query.trim()}>
          Search
        </Button>
      </form>

      {/* Results */}
      <div className="min-h-[400px]">
        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-destructive">Error: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && searchTerm && data && (
          <>
            {data.results.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found <span className="font-medium">{data.totalSize}</span> results for "
                    <span className="font-medium">{data.query}</span>"
                  </p>
                </div>
                <GroupedResults results={data.results} />
              </>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <Search className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">No results found</p>
                <p className="text-sm text-muted-foreground">
                  No records match "{searchTerm}". Try a different search term.
                </p>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && !searchTerm && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Search className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">Start searching</p>
            <p className="text-sm text-muted-foreground">
              Enter a search term to find records across all objects
            </p>
          </div>
        )}
      </div>

      {/* Quick Access */}
      <div className="border-t pt-6">
        <h3 className="mb-3 font-semibold">Quick Access</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              { type: "Account", href: "/accounts" },
              { type: "Contact", href: "/contacts" },
              { type: "Lead", href: "/leads" },
              { type: "Opportunity", href: "/opportunities" },
              { type: "Quote", href: "/quotes" },
            ] as const
          ).map(({ type, href }) => {
            const config = objectTypeConfig[type];
            return (
              <Link
                key={type}
                href={href}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    config.color
                  )}
                >
                  {config.icon}
                </div>
                <span className="text-sm font-medium">{type}s</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
