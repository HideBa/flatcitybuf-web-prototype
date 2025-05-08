import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type InfoPopupProps = {
  title: string;
  description: string;
  description2?: string;
};

const InfoPopup = ({ title, description, description2 }: InfoPopupProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-white border border-neutral-200 shadow-sm"
        >
          i
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-white border-neutral-200">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          {description2 && (
            <p className="text-sm text-muted-foreground">{description2}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InfoPopup;
