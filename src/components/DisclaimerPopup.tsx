import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

type DisclaimerPopupProps = {
	title: string;
	description: string;
	description2?: string;
};

const DisclaimerPopup = ({
	title,
	description,
	description2,
}: DisclaimerPopupProps) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="rounded-full w-8 h-8 p-0">
					i
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogDescription className="space-y-2">
					<p>{description}</p>
					{description2 && <p>{description2}</p>}
				</DialogDescription>
			</DialogContent>
		</Dialog>
	);
};

export default DisclaimerPopup;
