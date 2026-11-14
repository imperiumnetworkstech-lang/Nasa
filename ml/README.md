# Physiological-state model

`train-physio-state.ts` trains the experimental model shipped in `src/lib/ml/physio-state-model.json`.

1. Download the PhysioNet "Non-EEG Dataset for Assessment of Neurological Status" v1.0.0 (3.7 MB, ODC-By 1.0):
   https://physionet.org/content/noneeg/1.0.0/ → "Download the ZIP file".
2. Unzip into `ml/data/noneeg/` so that `ml/data/noneeg/non-eeg-dataset-for-assessment-of-neurological-status-1.0.0/Subject1_AccTempEDA.hea` exists. (`ml/data/` is git-ignored.)
3. `npm run ml:train`

The script parses WFDB format-16 signals and MIT annotations directly, builds 30 s windows (15 s hop) relative to each subject's first relaxed stage, runs leave-one-subject-out cross-validation, fits the final model, and writes the model JSON plus a few held-out sample windows used on the staff Insights page.

Citation: Birjandtalab J, Cogan D, Pouyan MB, Nourani M. Non-EEG Dataset for Assessment of Neurological Status. PhysioNet. https://doi.org/10.13026/C2J01F
