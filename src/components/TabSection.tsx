import { useState } from 'react';

import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import BlocklyEditor from './BlocklyEditor';
import '../styles/editor.css';
import { Code, Image, Volume2 } from 'lucide-react'
import { useSprites } from '../lib/sprites';
import SoundTab from'./SoundTab';
import ImageTab from './ImageTab';

export default function TabSection() { // this needs to be called tabsection cuz ts dosent liek it when i import tabpanel
    const { state, dispatch } = useSprites();
    const sprite = state.sprites.find(s => s.id === state.selectedSpriteId);
    return (
        <Tabs defaultIndex={0} forceRenderTabPanel={true}>
            <TabList>
                <Tab className="tab" selectedClassName="tab--selected">
                    <Code size={11} style={{paddingTop: '1px'}} strokeWidth={3} /> Code
                </Tab>
                <Tab className="tab" selectedClassName="tab--selected" disabled={sprite?.type !== 'media'} disabledClassName="tab--disabled">
                    <Image size={11} style={{paddingTop: '1px'}} strokeWidth={3} /> Images
                </Tab>
                <Tab className="tab" selectedClassName="tab--selected">
                    <Volume2 size={11} style={{paddingTop: '1px'}} strokeWidth={3} /> Audio
                </Tab>
            </TabList>
            <TabPanel>
                <BlocklyEditor />
            </TabPanel>
            <TabPanel>
                <ImageTab />
            </TabPanel>
            <TabPanel>
                <SoundTab />
            </TabPanel>
        </Tabs>
    )
}