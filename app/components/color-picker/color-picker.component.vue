<template>
  <GridLayout id="viewport" rows="20, *, *, *, *, *, *, *, *, *, *, auto, 20"
    columns="20, *, 20" >
    <GridLayout ref="colorPicker" id="color-picker"
      rows="*" columns="*" row="1" rowSpan="5" col="1" width="250" height="250"
      @loaded="onColorPickerLoaded" @touch="onColorPickerTouch($event)">
      <StackLayout id="hsl-spectrum-additions"></StackLayout>
      <StackLayout ref="hslSpectrum" id="hsl-spectrum" @loaded="onHslSpectrumLoaded"></StackLayout>

      <android>
          <StackLayout ref=hslSpectrum id="hsl-spectrum" @loaded="onHslSpectrumLoaded"></StackLayout>
          <StackLayout id="hsl-spectrum-additions"></StackLayout>
      </android>
      <ios>
          <StackLayout ref=hslSpectrum id="hsl-spectrum" v-if="hslSpectrumClipPath != ''"
              :style.clipPath="hslSpectrumClipPath"></StackLayout>
          <StackLayout id="hsl-spectrum-additions" :marginTop="hslSpectrumFrameWidth - 1"
              :marginLeft="hslSpectrumFrameWidth - 1" :marginBottom="hslSpectrumFrameWidth - 2"
              :marginRight="hslSpectrumFrameWidth - 2"></StackLayout>
      </ios>
    </GridLayout>

    <StackLayout id="lightness-slider" row="6" col="1" orientation="horizontal" height="30">
      <Label class="label" text="Lightness:" height="100" width="80" />
      <Slider minValue="0" maxValue="100" height="100" width="250" :value="lightness" @valueChange="onLightnessChanged($event)"></Slider>
    </StackLayout>
    <StackLayout id="alpha-slider" row="7" col="1" orientation="horizontal" height="30">
      <Label class="label" text="Alpha:" height="100" width="80" />
      <Slider minValue="0" maxValue="100" height="100" width="250" :value="alpha" @valueChange="onAlphaChanged($event)"></Slider>
    </StackLayout>

    <StackLayout row="8" rowSpan="1" col="1" id="primary"
        :backgroundColor="value" >
      <Label class="label color-value" :text="value" />
    </StackLayout>
  </GridLayout>
</template>

<script >
  import { TouchGestureEventData } from "tns-core-modules/ui/gestures";
  import { layout } from "tns-core-modules/utils/utils";
  import { Slider } from "tns-core-modules/ui/slider";
  import { Color } from "tns-core-modules/color";
  import { AnimationCurve } from "tns-core-modules/ui/enums";
  import { topmost } from "tns-core-modules/ui/frame";
  import {
      convertHslaColorToHexColor,
      convertHslaColorToRgbaColor,
      convertRgbaColorToColor,
      isDarkBetterForContrastWith,
      lightenOrDarkenHslaColor,
      hslaColorToCssValue,
  } from "./utilities";
  import { isAndroid, isIOS } from "tns-core-modules/platform";

  export default {
    name: 'ColorPicker',
    props: {
      value: {
        type: String,
      },
    },
    data() {
      return {
        hue: 0,
        saturation: 0,
        lightness: 50,
        alpha: 100,

        hslSpectrumFrameWidth: 0,
        hslSpectrumClipPath: '',

        width: 0,
        height: 0,

        x: 0,
        y: 0,

        centerX: 0,
        centerY: 0,

        cartesianX: 0,
        cartesianY: 0,

        polarMaxA: 0,
        polarA: 0,
        polarAlpha: 0,
      }
    },
    computed: {
      backgroundColor() {
        return { h: this.hue, s: this.saturation, l: this.lightness, a: 1 };
      }
    },
    filters: {
      hslaColorToCssValue,
    },
    methods: {
      onColorPickerLoaded() {
        setTimeout(this.initColorPicker.bind(this));
      },
      initColorPicker() {
        this.measure();
      },
      measure() {
        this.updateMeasurements();
        this.updateHslSpectrumClipPath();
        this.calculateCenterPoint();
        this.calculatePolarPointMaxA();
      },
      updateMeasurements() {
        this.width = layout.round(this.$refs.colorPicker.nativeView.getMeasuredWidth());
        this.height = layout.round((this.$refs.colorPicker.nativeView.getMeasuredHeight()));
        this.hslSpectrumFrameWidth = layout.toDeviceIndependentPixels(layout.round(this.width * 0.08));
      },
      updateHslSpectrumClipPath() {
        const fw = this.hslSpectrumFrameWidth;
        const w = layout.toDeviceIndependentPixels(this.width);
        const h = layout.toDeviceIndependentPixels(this.height);
        const oti = `${fw} ${h}`;
        const [tl, tr, bl, br] = ['0 0', `${w} 0`, `0 ${h}`, `${w} ${h}`];
        const [itl, itr, ibl, ibr] = [`${fw} ${fw}`, `${w - fw} ${fw}`, `${fw} ${h - fw}`, `${w - fw} ${h - fw}`];

        //
        // tl                               tr
        //   +-----------------------------+
        //   |                             |
        //   |     +-----------------+     |
        //   |     | itl         itr |     |
        //   |     | ibl         ibr |     |
        //   |     +-----------------+     |
        //   |     |                       |
        //   +-----+-----------------------+
        // bl     oti                       br
        //

        this.hslSpectrumClipPath = `polygon(${tl}, ${bl}, ${oti}, ${ibl}, ${itl}, ${itr}, ${ibr}, ${ibl}, ${oti}, ${br}, ${tr})`;
      },
      calculateCenterPoint() {
        this.centerX = layout.round(this.width / 2);
        this.centerY = layout.round(this.height / 2);
      },
      calculatePolarPointMaxA() {
        this.polarMaxA = layout.round(Math.sqrt(Math.pow(this.centerX, 2) + Math.pow(this.centerY, 2)));
      },
      onColorPickerTouch(args) {
        switch (args.action) {
            case 'move':
            case 'down':
              this.updateColorAccordingTo(args);
            break;
        }
      },
      updateColorAccordingTo(args) {
        this.updateColorPickerPoint({
            x: layout.toDevicePixels(args.getX()),
            y: layout.toDevicePixels(args.getY()),
        });

        this.calculateHueAndSaturation();
        this.colorize();
      },
      updateColorPickerPoint(args) {
        this.x = Math.min(this.width, Math.max(0, layout.round(args.x)));
        this.y = Math.min(this.height, Math.max(0, layout.round(args.y)));
      },
      calculateHueAndSaturation() {
        this.calculateCartesianPoint();
        this.calculatePolarPoint();

        this.hue = this.polarAlpha;
        this.saturation = Math.min(100, Math.round(this.polarA / Math.min(this.centerX, this.centerY) * 100));
      },
      calculateCartesianPoint() {
        this.cartesianX = this.x - this.centerX;
        this.cartesianY = this.y <= this.centerY
            ? (this.centerY - this.y)
            : (-1 * (this.y - this.centerY));
      },
      calculatePolarPoint() {
        const polarDegree = Math.atan2(this.cartesianY, this.cartesianX) * 180 / Math.PI;

        this.polarA = layout.round(Math.sqrt(Math.pow(this.cartesianX, 2) + Math.pow(this.cartesianY, 2)));
        this.polarAlpha = Math.ceil(polarDegree > 0 ? polarDegree : (360 + polarDegree)) - 1;
      },
      colorize() {
        const hslaColor = { h: this.hue, s: this.saturation, l: this.lightness, a: this.alpha == 0 ? 0 : this.alpha / 100 };

        // Update prop
        this.$emit('input', hslaColorToCssValue(hslaColor));
      },
      onLightnessChanged(slider) {
        this.lightness = Math.round(slider.value);
        this.colorize();
      },
      onAlphaChanged(slider) {
        this.alpha = Math.round(slider.value);
        this.colorize();
      },
      onHslSpectrumLoaded() {
        if (isAndroid) {
            setTimeout(this.drawTransparentBackgroundRectangle.bind(this));
        }
      },
      drawTransparentBackgroundRectangle() {
        if (!isAndroid) {
            throw new Error('Unexpexted Platform');
        }

        const widget = this.$refs.hslSpectrum.nativeView.android;
        const background = widget.getBackground();
        console.log(background); // eslint-disable-line
        const bitmap = background.getBackgroundBitmap();
        const canvas = new android.graphics.Canvas(bitmap);
        const color = new android.graphics.Paint();
        const frameWidth = this.hslSpectrumFrameWidth;
        const actualWidth = layout.toDeviceIndependentPixels(this.width);
        const canvasWidth = canvas.getWidth();
        const actualHeight = layout.toDeviceIndependentPixels(this.height);
        const canvasHeight = canvas.getHeight();
        const left = frameWidth * (canvasWidth / actualWidth);
        const top = frameWidth * (canvasHeight / actualHeight);
        const right = canvasWidth - left;
        const bottom = canvasHeight - top;

        color.setXfermode(new android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.CLEAR));
        canvas.drawRect(left, top, right, bottom, color);
      }
    }
  }
</script>

<style scoped>
#color-picker {
  background-color: transparent;
  border-radius: 200%;
  border-width: 0;
  android-elevation: 0;
}
#hsl-spectrum {
  background-image: url("~/assets/images/hsl-spectrum.png");
  background-size: 100% 100%;
  border-radius: 200%;
  border-width: 0;
  android-elevation: 0;
}

#hsl-spectrum-additions {
  /* background-image: url("~/assets/images/crosshair.png");
  background-position: center;
  background-repeat: no-repeat; */
  background-color: transparent;
  border-radius: 200%;
  android-elevation: 0;
  border-width: 0;
  display:none;
}

#primary {
    border-radius: 50;
}

#lightness-slider,
#alpha-slider {
  margin-left: 4;
  margin-right: 4;
  margin-top: 0;
}

.label {
  color: black;
  font-size: 16;
}

.color-value {
  margin-left: 110;
  margin-top: 15;
}
</style>
