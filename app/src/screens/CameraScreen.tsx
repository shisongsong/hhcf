import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { getMealTypeInfo, recognizeMealType } from '../utils/theme';
import api from '../api';

export const CameraScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { theme } = useApp();
  const [mealType, setMealType] = useState(route.params?.mealType || recognizeMealType());
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const defaultTitles = ['今天吃得真香！', '美味的一餐', '好好吃饭', '又是光盘行动', '幸福感满满'];

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePhoto = async () => {
    if (cameraRef.current && photos.length < 9) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo?.uri) {
          setPhotos([...photos, photo.uri]);
        }
      } catch (error) {
        Alert.alert('拍照失败', '请重试');
      }
    }
  };

  const pickImage = async () => {
    if (photos.length >= 9) {
      Alert.alert('提示', '最多9张照片');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert('提示', '请至少选择一张照片');
      return;
    }

    setUploading(true);
    try {
      await api.uploadRecord({
        mealType,
        title: title.trim() || '今天吃得真香！',
        photos,
      });
      
      Alert.alert('成功', '记录已保存', [
        { text: '确定', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('上传失败', error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionText, { color: theme.text }]}>
          需要相机权限来拍摄美食
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: theme.accent }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.text }]}>取消</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>记录美食</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Camera Preview */}
      {photos.length < 9 && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={[styles.flipButton, { backgroundColor: theme.card }]}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <Text style={styles.flipButtonText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.captureButton, { backgroundColor: theme.accent }]}
              onPress={takePhoto}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.flipButton, { backgroundColor: theme.card }]}
              onPress={pickImage}
            >
              <Text style={styles.flipButtonText}>🖼️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
          <ScrollView style={styles.photoContainer} keyboardShouldPersistTaps="handled" keyboardVerticalOffset={Platform.OS === 'android' ? 100 : 0}>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: '#FF3B30' }]}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Add More Photos */}
            {photos.length < 9 && (
              <TouchableOpacity style={[styles.addButton, { borderColor: theme.textSecondary }]} onPress={pickImage}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Title Input */}
          <View style={[styles.inputSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>标题（选填）</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="今天吃了什么？"
              placeholderTextColor={theme.textSecondary}
              maxLength={50}
            />
            <View style={styles.titleSuggestions}>
              {defaultTitles.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionChip, { borderColor: theme.textSecondary }]}
                  onPress={() => setTitle(t)}
                >
                  <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meal Type */}
          <View style={[styles.mealTypeSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>餐次</Text>
            <View style={styles.mealTypeList}>
              {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeButton,
                    { borderColor: theme.textSecondary },
                    mealType === type && { backgroundColor: theme.accent, borderColor: theme.accent }
                  ]}
                  onPress={() => setMealType(type)}
                >
                  <Text style={styles.mealTypeEmoji}>{getMealTypeInfo(type).emoji}</Text>
                  <Text style={[styles.mealTypeName, { color: mealType === type ? '#FFFFFF' : theme.text }]}>
                    {getMealTypeInfo(type).name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {photos.length === 0 && (
          <ScrollView style={styles.photoContainer} keyboardShouldPersistTaps="handled" keyboardVerticalOffset={Platform.OS === 'android' ? 100 : 0}>
          <View style={styles.photoGrid}>
            <TouchableOpacity style={[styles.addButton, { borderColor: theme.textSecondary }]} onPress={pickImage}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <View style={[styles.inputSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>标题（选填）</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="今天吃了什么？"
              placeholderTextColor={theme.textSecondary}
              maxLength={50}
            />
            <View style={styles.titleSuggestions}>
              {defaultTitles.map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionChip, { borderColor: theme.textSecondary }]}
                  onPress={() => setTitle(t)}
                >
                  <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meal Type */}
          <View style={[styles.mealTypeSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>餐次</Text>
            <View style={styles.mealTypeList}>
              {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeButton,
                    { borderColor: theme.textSecondary },
                    mealType === type && { backgroundColor: theme.accent, borderColor: theme.accent }
                  ]}
                  onPress={() => setMealType(type)}
                >
                  <Text style={styles.mealTypeEmoji}>{getMealTypeInfo(type).emoji}</Text>
                  <Text style={[styles.mealTypeName, { color: mealType === type ? '#FFFFFF' : theme.text }]}>
                    {getMealTypeInfo(type).name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Submit Button */}
      <View style={[styles.footer, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: photos.length > 0 && title.trim() ? theme.accent : '#CCCCCC' }
          ]}
          onPress={handleSubmit}
          disabled={uploading || photos.length === 0}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {uploading ? '上传中...' : '保存记录'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 60,
  },
  headerButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cameraContainer: {
    height: 300,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 20,
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
  },
  photoContainer: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  photoWrapper: {
    width: '31%',
    margin: '1%',
    aspectRatio: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    width: '31%',
    margin: '1%',
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 32,
    color: '#999999',
  },
  inputSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  mealTypeSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  mealTypeList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealTypeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  mealTypeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  mealTypeName: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: 34,
  },
  submitButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  titleSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
  },
});

export default CameraScreen;
