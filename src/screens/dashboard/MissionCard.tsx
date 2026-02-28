import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';

type MissionStatus = 'todo' | 'in_progress' | 'done';

type Mission = {
  id: string;
  title: string;
  category: string;
  xpReward: number;
  status: MissionStatus;
  description: string;
};

type MissionCardProps = {
  mission: Mission;
  onPress?: (mission: Mission) => void;
  style?: ViewStyle;
};

const CATEGORY_ICONS: Record<string, string> = {
  sleep: '🌙',
  mindfulness: '🧘',
  movement: '🏃',
  nutrition: '🥗',
  recovery: '💧',
  breathing: '🌬️',
  default: '⭐',
};

const STATUS_CONFIG: Record<
  MissionStatus,
  { label: string; color: string; bg: string; dotColor: string }
> = {
  todo: {
    label: 'À faire',
    color: '#A8A8C0',
    bg: '#1C1C28',
    dotColor: '#A8A8C0',
  },
  in_progress: {
    label: 'En cours',
    color: '#3D8BFF',
    bg: 'rgba(61,139,255,0.12)',
    dotColor: '#3D8BFF',
  },
  done: {
    label: 'Terminé',
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.10)',
    dotColor: '#4ADE80',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  sleep: '#7C3AED',
  mindfulness: '#0EA5E9',
  movement: '#F97316',
  nutrition: '#22C55E',
  recovery: '#06B6D4',
  breathing: '#8B5CF6',
  default: '#3D8BFF',
};

const MissionCard: React.FC<MissionCardProps> = ({ mission, onPress, style }) => {
  const categoryIcon = CATEGORY_ICONS[mission.category] ?? CATEGORY_ICONS.default;
  const categoryColor = CATEGORY_COLORS[mission.category] ?? CATEGORY_COLORS.default;
  const statusConfig = STATUS_CONFIG[mission.status];
  const isActive = mission.status === 'in_progress';
  const isDone = mission.status === 'done';

  return (
    <TouchableOpacity
      onPress={() => onPress?.(mission)}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: '#111118',
          borderRadius: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: isActive ? 'rgba(61,139,255,0.35)' : '#1C1C28',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Active indicator line at top */}
      {isActive && (
        <View
          style={{
            height: 2,
            backgroundColor: '#3D8BFF',
            width: '100%',
          }}
        />
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
        }}
      >
        {/* Category Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: `${categoryColor}1A`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
            borderWidth: 1,
            borderColor: `${categoryColor}33`,
          }}
        >
          <Text style={{ fontSize: 20 }}>{categoryIcon}</Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              color: isDone ? '#A8A8C0' : '#E8E8F0',
              fontSize: 15,
              fontWeight: '600',
              letterSpacing: -0.2,
              marginBottom: 4,
              textDecorationLine: isDone ? 'line-through' : 'none',
            }}
            numberOfLines={1}
          >
            {mission.title}
          </Text>
          <Text
            style={{
              color: '#A8A8C0',
              fontSize: 12,
              lineHeight: 17,
            }}
            numberOfLines={1}
          >
            {mission.description}
          </Text>

          {/* Status badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusConfig.dotColor,
                marginRight: 5,
              }}
            />
            <Text
              style={{
                color: statusConfig.color,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.3,
              }}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* XP Badge */}
        <View
          style={{
            backgroundColor: isActive ? 'rgba(61,139,255,0.15)' : '#1C1C28',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isActive ? 'rgba(61,139,255,0.4)' : '#2A2A3C',
          }}
        >
          <Text
            style={{
              color: isActive ? '#3D8BFF' : '#A8A8C0',
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            +{mission.xpReward}
          </Text>
          <Text
            style={{
              color: isActive ? '#3D8BFF' : '#A8A8C0',
              fontSize: 9,
              fontWeight: '600',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginTop: 1,
              opacity: 0.8,
            }}
          >
            XP
          </Text>
        </View>

        {/* Done checkmark overlay */}
        {isDone && (
          <View
            style={{
              marginLeft: 8,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(74,222,128,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(74,222,128,0.4)',
            }}
          >
            <Text style={{ fontSize: 14 }}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default MissionCard;
