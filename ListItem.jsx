import React from "react";
import { CheckBox } from "react-native-elements";

const ListItem = ({ title, checked, onPress }) => {
  return (
    <CheckBox
      title={title}
      checkedIcon="check-circle"
      uncheckedIcon="circle-o"
      checkedColor="#46A522"
      uncheckedColor="green"
      checked={checked}
      onPress={onPress}
    />
  );
};

export default ListItem;
