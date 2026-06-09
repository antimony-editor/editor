import { X } from 'lucide-react';

const credits = [
	{
		name: 'Gen1x',
		url: 'https://gen1x.imsogay.me',
		roles: 'Lead Developer, Founder, Designer',
	},
	{
		name: 'Dotun',
		url: 'https://afkdev.me',
		roles: 'Co-Owner, Lead Developer, Designer',
	},
	{
		name: 'UnbraveChimp',
		url: 'https://ash0.dev',
		roles: 'Developer, Designer, Logo',
	},
	{
		name: 'ddededodediamante',
		url: 'https://ddededodediamante.vercel.app/',
		roles: 'Developer',
	},
];

interface CreditsModalProps {
	isClosing?: boolean;
	onClose: () => void;
}

export default function CreditsModal({ isClosing = false, onClose }: CreditsModalProps) {
	return (
		<div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onClick={onClose}>
			<div className="modal-content credits-modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2>Credits</h2>
					<button className="close-modal-btn" onClick={onClose}><X size={18} /></button>
				</div>
				<div className="modal-body credits-modal-body">
					<div className="credits-list">
						{credits.map((credit) => (
							<a
								key={credit.name}
								className="credit-row"
								href={credit.url}
								target="_blank"
								rel="noreferrer"
							>
								<span className="credit-name">{credit.name}</span>
								<span className="credit-roles">{credit.roles}</span>
							</a>
						))}
					</div>
					<p className="credits-thanks">Thank you for using Antimony!</p>
				</div>
			</div>
		</div>
	);
}
