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
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { getMealTypeInfo, recognizeMealType, getAllMealTypes, generateTitle } from '../utils/theme';
import api from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH - 80;

export const CameraScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { theme } = useApp();
  const [mealType, setMealType] = useState(route.params?.mealType || recognizeMealType());
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const mealTypes = getAllMealTypes();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    setTitle(generateTitle(mealType));
  }, []);

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
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(a => a.uri);
      setPhotos([...photos, ...newPhotos].slice(0, 9));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (photos.length === 0) {
      Alert.alert('提示', '请先拍照');
      return;
    }

    setUploading(true);
    setUploadProgress('上传中...');
    try {
      await api.uploadRecord({
        mealType,
        title: title.trim() || generateTitle(mealType),
        photos,
      });
      
      setUploadProgress('上传完成');
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error: any) {
      setUploadProgress('上传失败，点击重试');
      Alert.alert('上传失败', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleMealSelect = (key: string) => {
    setMealType(key);
    setTitle(generateTitle(key));
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: '#1a1a1a' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: '#1a1a1a' }]}>
        <Text style={styles.permissionText}>需要相机权限来拍摄美食</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 关闭按钮 */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      {/* 取景框 */}
      {photos.length < 9 && (
        <View style={styles.viewfinder}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          />
          <View style={styles.frameCorner} />
          <View style={[styles.frameCorner, styles.frameCornerTR]} />
          <View style={[styles.frameCorner, styles.frameCornerBL]} />
          <View style={[styles.frameCorner, styles.frameCornerBR]} />
        </View>
      )}

      {/* 底部面板 */}
      <View style={styles.bottomPanel}>
        {/* 照片预览 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailList}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.thumbnailItem}>
              <Image source={{ uri: photo }} style={styles.thumbnailImg} />
              <TouchableOpacity style={styles.thumbnailDelete} onPress={() => removePhoto(index)}>
                <Text style={styles.thumbnailDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 9 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
              <Text style={styles.addPhotoBtnText}>+</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* 餐别选择 */}
        <View style={styles.mealSection}>
          <Text style={styles.sectionTitle}>选择餐别</Text>
          <View style={styles.mealList}>
            {mealTypes.map((meal) => (
              <TouchableOpacity
                key={meal.key}
                style={[styles.mealItem, mealType === meal.key && styles.mealItemSelected]}
                onPress={() => handleMealSelect(meal.key)}
              >
                <View style={[styles.mealIcon, { backgroundColor: mealType === meal.key ? meal.color : 'rgba(255,255,255,0.12)' }]}>
                  <Text style={styles.mealEmoji}>{meal.emoji}</Text>
                </View>
                <Text style={[styles.mealLabel, { color: mealType === meal.key ? '#fff' : 'rgba(255,255,255,0.7)' }]}>
                  {meal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 标题 */}
        <TouchableOpacity style={styles.titleSection}>
          <Text style={styles.sectionTitle}>标题</Text>
          <View style={styles.titleBar}>
            <Text style={styles.titleText}>{title}</Text>
            <View style={styles.editBtn}>
              <Text style={styles.editBtnText}>编辑</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 底部控制栏 */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={pickImage}>
            <View style={styles.controlIconWrapper}>
              <Text style={styles.controlIcon}>🖼️</Text>
            </View>
            <Text style={styles.controlLabel}>相册</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlBtn, photos.length === 0 && styles.controlBtnDisabled]} 
            onPress={handleSave}
            disabled={photos.length === 0 || uploading}
          >
            <View style={styles.controlIconWrapper}>
              <Text style={styles.controlIcon}>✔</Text>
            </View>
            <Text style={styles.controlLabel}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 上传遮罩 */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            {uploadProgress === '上传完成' ? (
              <Text style={styles.successIcon}>✓</Text>
            ) : (
              <ActivityIndicator size="small" color="#FF8C42" />
            )}
            <Text style={styles.statusText}>{uploadProgress}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    alignSelf: 'center',
    marginTop: 90,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  frameCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#fff',
    borderStyle: 'solid',
    top: 8,
    left: 8,
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  frameCornerTR: {
    left: undefined,
    right: 8,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
    borderTopLeftRadius: 0,
  },
  frameCornerBL: {
    top: undefined,
    bottom: 8,
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 6,
  },
  frameCornerBR: {
    top: undefined,
    left: undefined,
    right: 8,
    bottom: 8,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 34,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  thumbnailList: {
    maxHeight: 52,
    marginBottom: 5,
  },
  thumbnailItem: {
    width: 50,
    height: 50,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailDelete: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailDeleteText: {
    color: '#fff',
    fontSize: 11,
  },
  addPhotoBtn: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 24,
  },
  mealSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mealList: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  mealItem: {
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  mealItemSelected: {},
  mealIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmoji: {
    fontSize: 16,
  },
  mealLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  titleSection: {
    marginTop: 5,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  titleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  editBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  controlBtn: {
    alignItems: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  controlIconWrapper: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    fontSize: 20,
    color: '#fff',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  uploadCard: {
    backgroundColor: '#1f1f1f',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
  },
  successIcon: {
    fontSize: 28,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
});

export default CameraScreen;
