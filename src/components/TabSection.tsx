import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import BlocklyEditor from "./BlocklyEditor";
import { Code, Image as ImageIcon, Video, Volume2, Spline } from "lucide-react";
import { useSprites } from "../lib/sprites";
import SoundTab from "./SoundTab";
import ImageTab from "./ImageTab";
import VideoTab from "./VideoTab";
import TweenTab from "./TweenTab";
import { Dispatch, SetStateAction } from "react";

export default function TabSection({showMenu}:{showMenu:Dispatch<SetStateAction<boolean>>}) {
  const { state } = useSprites();
  const sprite = state.sprites.find((s) => s.id === state.selectedSpriteId);

  return (
    <Tabs defaultIndex={0} forceRenderTabPanel={true}>
      <TabList>
        <Tab className="tab" selectedClassName="tab--selected">
          <Code size={11} style={{ paddingTop: "1px" }} strokeWidth={3} /> Code
        </Tab>
        {sprite?.type === "media" && (
          <Tab className="tab" selectedClassName="tab--selected">
            <ImageIcon
              size={11}
              style={{ paddingTop: "1px" }}
              strokeWidth={3}
            />{" "}
            Image
          </Tab>
        )}
        {sprite?.type === "video" && (
          <Tab className="tab" selectedClassName="tab--selected">
            <Video size={11} style={{ paddingTop: "1px" }} strokeWidth={3} />{" "}
            Video
          </Tab>
        )}
        <Tab className="tab" selectedClassName="tab--selected">
          <Volume2 size={11} style={{ paddingTop: "1px" }} strokeWidth={3} />{" "}
          Audio
        </Tab>
        <Tab className="tab" selectedClassName="tab--selected">
          <Spline size={11} style={{ paddingTop: "1px" }} strokeWidth={3} />{" "}
          Tweens
        </Tab>
      </TabList>
      <TabPanel>
        <BlocklyEditor showMenu={showMenu} />
      </TabPanel>
      {sprite?.type === "media" && (
        <TabPanel>
          <ImageTab />
        </TabPanel>
      )}
      {sprite?.type === "video" && (
        <TabPanel>
          <VideoTab />
        </TabPanel>
      )}
      <TabPanel>
        <SoundTab />
      </TabPanel>
      <TabPanel>
        <TweenTab />
      </TabPanel>
    </Tabs>
  );
}
