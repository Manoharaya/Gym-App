import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Screen, Card, Badge, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import { ptService } from '../services/ptService';
import type { TrainerNote, TrainerNoteType, TrainerNoteVisibility } from '@fitcore/types';

const sp = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
};

const colors = {
  ...themeColors,
  surfaceHighlight: themeColors.surfaceElevated,
  borderSubtle: themeColors.border,
};

export const TrainerNotesScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const memberProfileId = route.params?.memberProfileId || 'cmtq4sgyf00awpo1eqvfo3zy8';
  const [notes, setNotes] = useState<TrainerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | TrainerNoteVisibility>('ALL');

  // Modal State
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<TrainerNoteType>('COACHING');
  const [noteVisibility, setNoteVisibility] = useState<TrainerNoteVisibility>('PRIVATE'); // Safe Default

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ptService.getMemberNotes(memberProfileId);
      setNotes(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load notes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memberProfileId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Required', 'Note text cannot be empty.');
      return;
    }
    try {
      const created = await ptService.createNote(memberProfileId, {
        content: noteContent,
        noteType,
        visibility: noteVisibility,
      });
      setNotes((prev) => [created, ...prev]);
      setNoteModalVisible(false);
      setNoteContent('');
      setNoteVisibility('PRIVATE'); // Reset to safe default
      Alert.alert('Note Created', `Saved with ${created.visibility} visibility.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save note.');
    }
  };

  const filtered = notes.filter((n) => {
    if (filter === 'ALL') return true;
    return n.visibility === filter;
  });

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trainer Notes Vault</Text>
        <Text style={styles.headerSubtitle}>Confidential observations & coaching feedback</Text>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {(['ALL', 'PRIVATE', 'STAFF', 'MEMBER_VISIBLE'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.filterChip, filter === v && styles.filterChipActive]}
            onPress={() => setFilter(v)}
          >
            <Text style={[styles.filterChipText, filter === v && styles.filterChipTextActive]}>
              {v === 'ALL'
                ? 'All'
                : v === 'PRIVATE'
                ? '🔒 Private'
                : v === 'STAFF'
                ? '🛡️ Staff'
                : '👁️ Member'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.actionBar}>
              <Text style={styles.countText}>{filtered.length} Notes</Text>
              <Button title="+ Add Note" variant="primary" size="sm" onPress={() => setNoteModalVisible(true)} />
            </View>

            {filtered.map((n) => (
              <Card key={n.id} style={styles.noteCard}>
                <View style={styles.noteTop}>
                  <Badge
                    label={
                      n.visibility === 'PRIVATE'
                        ? '🔒 PRIVATE'
                        : n.visibility === 'STAFF'
                        ? '🛡️ STAFF'
                        : '👁️ MEMBER VISIBLE'
                    }
                    variant={
                      n.visibility === 'PRIVATE'
                        ? 'warning'
                        : n.visibility === 'STAFF'
                        ? 'info'
                        : 'success'
                    }
                  />
                  <Text style={styles.typeText}>{n.noteType}</Text>
                  <Text style={styles.dateText}>{new Date(n.createdAt).toLocaleDateString()}</Text>
                </View>

                <Text style={styles.contentText}>{n.content}</Text>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Notes Found</Text>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Note Composer Modal */}
      <Modal visible={noteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Coaching Note</Text>

            <Text style={styles.inputLabel}>Visibility (Default: Private)</Text>
            <View style={styles.visRow}>
              {(['PRIVATE', 'STAFF', 'MEMBER_VISIBLE'] as TrainerNoteVisibility[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.visBtn, noteVisibility === v && styles.visBtnActive]}
                  onPress={() => setNoteVisibility(v)}
                >
                  <Text style={[styles.visBtnText, noteVisibility === v && styles.visBtnTextActive]}>
                    {v === 'PRIVATE' ? '🔒 Private' : v === 'STAFF' ? '🛡️ Staff' : '👁️ Member'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Note Category</Text>
            <View style={styles.visRow}>
              {(['COACHING', 'SESSION', 'GOAL', 'GENERAL'] as TrainerNoteType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.visBtn, noteType === t && styles.visBtnActive]}
                  onPress={() => setNoteType(t)}
                >
                  <Text style={[styles.visBtnText, noteType === t && styles.visBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Clinical assessments, technique cues, progress observations..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={noteContent}
              onChangeText={setNoteContent}
            />

            <View style={styles.actionsRow}>
              <Button title="Cancel" variant="outline" size="sm" onPress={() => setNoteModalVisible(false)} style={styles.flexBtn} />
              <Button title="Save Note" variant="primary" size="sm" onPress={handleCreateNote} style={styles.flexBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: sp.md,
    paddingTop: sp.md,
    paddingBottom: sp.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: { marginBottom: sp.xs },
  backBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  headerTitle: { ...typography.h2, color: colors.textPrimary },
  headerSubtitle: { ...typography.caption, color: colors.textMuted },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    gap: sp.xs,
  },
  filterChip: {
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHighlight,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { ...typography.caption, color: colors.textMuted },
  filterChipTextActive: { color: '#000', fontWeight: '700' },
  scrollContent: { padding: sp.md, gap: sp.md },
  loadingContainer: { padding: sp.xl, alignItems: 'center' },
  listContainer: { gap: sp.md },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countText: { ...typography.caption, color: colors.textMuted },
  noteCard: { padding: sp.md, backgroundColor: colors.surface, borderColor: colors.borderSubtle },
  noteTop: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.xs },
  typeText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  dateText: { ...typography.caption, color: colors.textMuted },
  contentText: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 18 },
  emptyCard: { padding: sp.lg, alignItems: 'center' },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: sp.md },
  modalCard: { backgroundColor: colors.modalBackground, borderRadius: radius.md, padding: sp.lg, gap: sp.sm },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  inputLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  visRow: { flexDirection: 'row', gap: sp.xs },
  visBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
  },
  visBtnActive: { backgroundColor: colors.primary },
  visBtnText: { ...typography.caption, color: colors.textMuted },
  visBtnTextActive: { color: '#000', fontWeight: '700' },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    padding: sp.sm,
    color: colors.textPrimary,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  actionsRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.sm },
  flexBtn: { flex: 1 },
});
