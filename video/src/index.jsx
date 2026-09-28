import React from 'react'
import { Composition, registerRoot } from 'remotion'
import { BannerKlinik, BannerKlinikHP } from './Banner.jsx'

function Root() {
  return (
    <>
      <Composition id="BannerKlinik" component={BannerKlinik} durationInFrames={300} fps={30} width={1280} height={400} />
      <Composition id="BannerKlinikHP" component={BannerKlinikHP} durationInFrames={300} fps={30} width={720} height={720} />
    </>
  )
}
registerRoot(Root)
