<template>
    <Page>
        <ActionBar title="Color Picker" :backgroundColor="color"/>
        <GridLayout columns="*" rows="*">
            <ColorPicker v-model="color" />
        </GridLayout>
    </Page>
</template>

<script >
  import ColorPicker from './color-picker/color-picker.component';

  export default {
    components: {
      ColorPicker
    },
    data() {
      return {
        color: 'rgba(216, 67, 65, 1)',
      };
    }
  }
</script>

<style scoped>
    ActionBar {
        color: #ffffff;
    }
</style>
