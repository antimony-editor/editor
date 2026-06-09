import { useReducer, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SpriteContext, spriteReducer, initialSpriteState } from './lib/sprites';
import HeaderBar from './components/HeaderBar';
import SpritePanel from './components/SpritePanel';
import StageView from './components/StageView';
import BlocklyEditor from './components/BlocklyEditor';
import PropertiesPanel from './components/PropertiesPanel';
import CreditsModal from './components/CreditsModal';
import SettingsModal from './components/SettingsModal';
import runtime from './lib/runtime';
import { serializeProject, deserializeProject } from './lib/projectFormat';
import { DEFAULT_PROJECT_SETTINGS, ProjectSettingsContext, type ProjectSettings } from './lib/settings';
import './styles/editor.css';

import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
hljs.registerLanguage('javascript', javascript);

const MODAL_EXIT_MS = 120;
type ModalKey = 'js' | 'credits' | 'settings';

export default function App() {
	const [state, dispatch] = useReducer(spriteReducer, initialSpriteState);
	const [showJS, setShowJS] = useState(false);
	const [generatedJS, setGeneratedJS] = useState('');
	const [projectName, setProjectName] = useState('Untitled Project');
	const [projectSettings, setProjectSettings] = useState<ProjectSettings>(DEFAULT_PROJECT_SETTINGS);
	const [showCredits, setShowCredits] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [closingModals, setClosingModals] = useState<Record<ModalKey, boolean>>({
		js: false,
		credits: false,
		settings: false,
	});
	const modalCloseTimers = useRef<Partial<Record<ModalKey, number>>>({});

	useEffect(() => {
		return () => {
			Object.values(modalCloseTimers.current).forEach((timer) => {
				if (timer) window.clearTimeout(timer);
			});
		};
	}, []);

	const openModal = useCallback((key: ModalKey, setOpen: (open: boolean) => void) => {
		const timer = modalCloseTimers.current[key];
		if (timer) {
			window.clearTimeout(timer);
			delete modalCloseTimers.current[key];
		}
		setClosingModals((current) => current[key] ? { ...current, [key]: false } : current);
		setOpen(true);
	}, []);

	const closeModal = useCallback((key: ModalKey, setOpen: (open: boolean) => void) => {
		if (modalCloseTimers.current[key]) return;
		setClosingModals((current) => current[key] ? current : { ...current, [key]: true });
		modalCloseTimers.current[key] = window.setTimeout(() => {
			setOpen(false);
			setClosingModals((current) => current[key] ? { ...current, [key]: false } : current);
			delete modalCloseTimers.current[key];
		}, MODAL_EXIT_MS);
	}, []);

	const updateProjectSettings = useCallback((changes: Partial<ProjectSettings>) => {
		setProjectSettings((current) => ({ ...current, ...changes }));
	}, []);

	const handleSeeJS = () => {
		setGeneratedJS(runtime.compile().trim());
		openModal('js', setShowJS);
	};

	const handleSave = async () => {
		const buffer = await serializeProject(projectName, state, projectSettings);
		const blob = new Blob([buffer], { type: 'application/octet-stream' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${projectName.replace(/\s+/g, '_').toLowerCase()}.antimony`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleLoad = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.antimony';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = async (re) => {
				try {
					const buffer = re.target?.result as ArrayBuffer;
					const project = await deserializeProject(buffer);
					setProjectName(project.projectName);
					setProjectSettings(project.settings);
					dispatch({ type: 'LOAD_PROJECT', state: project.state });
				} catch (err) {
					console.error('Failed to load project:', err);
					alert('Failed to load project file. Invalid format.');
				}
			};
			reader.readAsArrayBuffer(file);
		};
		input.click();
	};

	const highlightedCode = useMemo(() => {
		if (!generatedJS) return '';
		return hljs.highlight(generatedJS, { language: 'javascript' }).value;
	}, [generatedJS]);

	const lineNumbers = useMemo(() => {
		if (!generatedJS) return [1];
		return generatedJS.split('\n').map((_, i) => i + 1);
	}, [generatedJS]);

	return (
		<SpriteContext.Provider value={{ state, dispatch }}>
			<ProjectSettingsContext.Provider value={{
				settings: projectSettings,
				setSettings: setProjectSettings,
				updateSettings: updateProjectSettings,
			}}>
				<div className="editor-shell">
					<HeaderBar
						projectName={projectName}
						onProjectNameChange={setProjectName}
						onSeeJS={handleSeeJS}
						onSave={handleSave}
						onLoad={handleLoad}
						onOpenCredits={() => openModal('credits', setShowCredits)}
						onOpenSettings={() => openModal('settings', setShowSettings)}
					/>
					<BlocklyEditor />
					<div className="right-column">
						<StageView />
						<div className="panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
							<PropertiesPanel />
							<SpritePanel />
						</div>
					</div>
				</div>

				{showCredits && (
					<CreditsModal
						isClosing={closingModals.credits}
						onClose={() => closeModal('credits', setShowCredits)}
					/>
				)}

				{showSettings && (
					<SettingsModal
						settings={projectSettings}
						onChange={setProjectSettings}
						isClosing={closingModals.settings}
						onClose={() => closeModal('settings', setShowSettings)}
					/>
				)}

				{showJS && (
					<div
						className={`modal-overlay ${closingModals.js ? 'is-closing' : ''}`}
						onClick={() => closeModal('js', setShowJS)}
					>
						<div className="modal-content" onClick={(e) => e.stopPropagation()}>
							<div className="modal-header">
								<h2>Generated JavaScript</h2>
								<button className="close-modal-btn" onClick={() => closeModal('js', setShowJS)}><X size={18} /></button>
							</div>
							<div className="modal-body">
								<div className="code-container">
									<div className="line-numbers">
										{lineNumbers.map(n => <div key={n}>{n}</div>)}
									</div>
									<pre className="code-content" dangerouslySetInnerHTML={{ __html: highlightedCode || '' }} />
								</div>
							</div>
						</div>
					</div>
				)}
			</ProjectSettingsContext.Provider>
		</SpriteContext.Provider>
	);
}
