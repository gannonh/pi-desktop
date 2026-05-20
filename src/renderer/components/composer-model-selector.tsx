import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { groupModelOptionsByProvider, type ComposerModelOption } from "../chat/composer-view-model";

interface ComposerModelSelectorProps {
	label: string;
	open: boolean;
	modelOptions: ComposerModelOption[];
	selectedModelProvider: string | null;
	selectedModelId: string | null;
	onToggle: (open: boolean) => void;
	onSelectModel?: (provider: string, modelId: string) => void;
}

export function ComposerModelSelector({
	label,
	open,
	modelOptions,
	selectedModelProvider,
	selectedModelId,
	onToggle,
	onSelectModel,
}: ComposerModelSelectorProps) {
	const menuId = useId();
	const [activeProvider, setActiveProvider] = useState<string | null>(null);
	const providerGroups = groupModelOptionsByProvider(modelOptions);
	const activeGroup = activeProvider ? providerGroups.find((group) => group.provider === activeProvider) : null;

	useEffect(() => {
		if (!open) {
			setActiveProvider(null);
		}
	}, [open]);

	const closeMenu = () => {
		setActiveProvider(null);
		onToggle(false);
	};

	return (
		<span className="composer__control-wrap">
			<button
				className="composer__control"
				type="button"
				aria-controls={menuId}
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={() => onToggle(!open)}
			>
				<span className="composer__control-label">{label}</span>
				<ChevronDown className="composer__control-icon" />
			</button>
			{open ? (
				<span className="composer__model-menu" id={menuId} role="menu">
					{activeGroup ? (
						<>
							<button
								type="button"
								className="composer__model-menu-back"
								onClick={() => setActiveProvider(null)}
							>
								<ChevronLeft className="composer__model-menu-chevron" aria-hidden />
								Providers
							</button>
							<span className="composer__local-menu-header">{activeGroup.label}</span>
							{activeGroup.models.map((model) => {
								const selected = selectedModelProvider === model.provider && selectedModelId === model.id;
								return (
									<button
										key={`${model.provider}:${model.id}`}
										type="button"
										role="menuitem"
										className={[
											"composer__local-menu-item",
											selected ? "composer__local-menu-item--selected" : "",
										]
											.filter(Boolean)
											.join(" ")}
										aria-current={selected ? "true" : undefined}
										onClick={() => {
											onSelectModel?.(model.provider, model.id);
											closeMenu();
										}}
									>
										{model.label}
									</button>
								);
							})}
						</>
					) : (
						providerGroups.map((group) => (
							<button
								key={group.provider}
								type="button"
								role="menuitem"
								className="composer__model-menu-provider"
								aria-label={`${group.label}, ${group.models.length} models`}
								onClick={() => setActiveProvider(group.provider)}
							>
								<span className="composer__model-menu-provider-label">{group.label}</span>
								<span className="composer__model-menu-provider-meta">{group.models.length}</span>
								<ChevronRight className="composer__model-menu-chevron" aria-hidden />
							</button>
						))
					)}
				</span>
			) : null}
		</span>
	);
}
