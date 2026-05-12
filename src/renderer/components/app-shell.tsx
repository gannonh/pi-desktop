import { Badge } from "@/renderer/components/ui/badge";
import { Button } from "@/renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/renderer/components/ui/card";
import { ScrollArea } from "@/renderer/components/ui/scroll-area";
import { Separator } from "@/renderer/components/ui/separator";
import type { WorkspaceState } from "@/shared/workspace-state";
import { FolderOpen, PanelRight, Play, Terminal } from "lucide-react";
import { createShellSections } from "../shell/shell-state";

interface AppShellProps {
	state: WorkspaceState;
	versionLabel: string;
	statusMessage?: string;
	onSelectWorkspace: () => void;
}

export function AppShell({ state, versionLabel, statusMessage, onSelectWorkspace }: AppShellProps) {
	const sections = createShellSections(state);

	return (
		<div
			data-testid="app-shell"
			className="grid h-screen min-h-[640px] grid-cols-[240px_minmax(360px,1fr)_280px] bg-background text-foreground"
		>
			<aside className="flex min-w-0 flex-col border-r border-border bg-muted/20">
				<div className="flex h-14 items-center gap-2 px-4">
					<div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
						pi
					</div>
					<div className="min-w-0">
						<div className="truncate text-sm font-medium">pi-desktop</div>
						<div className="truncate text-xs text-muted-foreground">{versionLabel}</div>
					</div>
				</div>
				<Separator />
				<div className="space-y-3 p-3">
					<Button className="w-full justify-start gap-2" variant="secondary" onClick={onSelectWorkspace}>
						<FolderOpen className="size-4" />
						Open folder
					</Button>
					<Card>
						<CardHeader className="p-3">
							<CardTitle className="text-sm">{sections.workspaceLabel}</CardTitle>
						</CardHeader>
						<CardContent className="px-3 pb-3 pt-0">
							<p className="truncate text-xs text-muted-foreground">{sections.workspacePath}</p>
						</CardContent>
					</Card>
					{statusMessage ? (
						<div className="break-words rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
							{statusMessage}
						</div>
					) : null}
				</div>
				<ScrollArea className="min-h-0 flex-1 px-3 pb-3">
					<div className="space-y-2">
						<div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sessions</div>
						{state.sessions.map((session) => (
							<button
								className="w-full rounded-md border border-transparent px-3 py-2 text-left text-sm hover:border-border hover:bg-muted"
								key={session.id}
								type="button"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="truncate">{session.title}</span>
									<Badge variant={session.status === "failed" ? "destructive" : "secondary"}>
										{session.status}
									</Badge>
								</div>
								<div className="mt-1 text-xs text-muted-foreground">{session.lastUpdatedLabel}</div>
							</button>
						))}
					</div>
				</ScrollArea>
			</aside>

			<main className="flex min-w-0 flex-col">
				<header className="flex h-14 items-center justify-between border-b border-border px-5">
					<div className="min-w-0">
						<h1 className="truncate text-sm font-semibold">Milestone 0 foundation</h1>
						<p className="truncate text-xs text-muted-foreground">Static shell for future Pi sessions</p>
					</div>
					<Badge variant="outline">macOS local</Badge>
				</header>
				<section className="flex min-h-0 flex-1 flex-col justify-between p-5">
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<Play className="size-4" />
									Ready for Pi runtime adapter
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-muted-foreground">
								<p>Milestone 0 proves the app shell, typed IPC, tooling, checks, and smoke test.</p>
								<p>Real agent sessions begin in Milestone 2.</p>
							</CardContent>
						</Card>
					</div>
					<div className="rounded-lg border border-border bg-card p-3">
						<div className="text-xs text-muted-foreground">Composer surface</div>
						<div className="mt-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
							Ask Pi to work in this project
						</div>
					</div>
				</section>
			</main>

			<aside className="flex min-w-0 flex-col border-l border-border bg-muted/10">
				<div className="flex h-14 items-center gap-2 border-b border-border px-4">
					<PanelRight className="size-4" />
					<div className="text-sm font-medium">Details</div>
				</div>
				<ScrollArea className="min-h-0 flex-1 p-4">
					<div className="space-y-3">
						{state.panels.map((panel) => (
							<Card key={panel.id}>
								<CardHeader className="p-3">
									<CardTitle className="flex items-center gap-2 text-sm">
										{panel.kind === "terminal" ? <Terminal className="size-4" /> : null}
										{panel.title}
									</CardTitle>
								</CardHeader>
								<CardContent className="px-3 pb-3 pt-0 text-xs text-muted-foreground">
									{panel.summary}
								</CardContent>
							</Card>
						))}
					</div>
				</ScrollArea>
				<div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Runtime: not connected</div>
			</aside>
		</div>
	);
}
